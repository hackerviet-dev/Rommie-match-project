using System.Data.Common;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;
using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Services;

public sealed class WorkspaceException(int status, string message) : Exception(message) { public int Status { get; } = status; }
public sealed record AccountAccessRequest([Required, RegularExpression("^(member|moderator|admin)$")] string Role, bool IsActive, [Required, StringLength(2000, MinimumLength=5)] string Note);
public sealed record RoomReviewRequest([Required, RegularExpression("^(approved|rejected)$")] string Status, [Required, StringLength(2000, MinimumLength=5)] string Note, [Required] DateTimeOffset? ExpectedUpdatedAt);
public sealed record GroupCreateRequest([Required, StringLength(160, MinimumLength=3)] string Name, Guid? RoomId);
public sealed record GroupInviteRequest([Required, EmailAddress] string Email);
public sealed record GroupRoleRequest([Required, RegularExpression("^(owner|manager|member)$")] string Role);
public sealed record DisputeCreateRequest(Guid RespondentId, Guid? RoomId, Guid? GroupId, [Required,StringLength(180, MinimumLength=5)] string Title, [Required,StringLength(5000, MinimumLength=20)] string Details);
public sealed record DisputeMessageRequest([Required,StringLength(4000, MinimumLength=1)] string Content);
public sealed record DisputeReviewRequest([Required,RegularExpression("^(investigating|resolved|dismissed)$")] string Status, [Required,StringLength(2000, MinimumLength=5)] string Note);

// JSON projections explicitly whitelist fields; credentials and private chat history never leave this service.
public sealed class WorkspaceService(IDbConnectionFactory factory)
{
    private static void Text(string value,int min,int max)
    {
        if(value.Trim().Length<min || value.Trim().Length>max)throw new WorkspaceException(400,$"Nội dung phải có từ {min} đến {max} ký tự sau khi bỏ khoảng trắng.");
    }
    private static async Task<List<JsonElement>> Rows(DbConnection c, string sql, CancellationToken ct, params (string,object?)[] args)
    {
        await using var cmd=c.CreateCommand(); cmd.CommandText=sql;
        foreach(var (k,v) in args) cmd.AddParameter(k,v);
        var rows=new List<JsonElement>(); await using var r=await cmd.ExecuteReaderAsync(ct);
        while(await r.ReadAsync(ct)){using var doc=JsonDocument.Parse(r.GetString(0));rows.Add(doc.RootElement.Clone());}
        return rows;
    }
    private static async Task<int> Write(DbConnection c, DbTransaction tx, string sql, CancellationToken ct, params (string,object?)[] args)
    {
        await using var cmd=c.CreateCommand(); cmd.Transaction=tx; cmd.CommandText=sql;
        foreach(var (k,v) in args)cmd.AddParameter(k,v); return await cmd.ExecuteNonQueryAsync(ct);
    }
    private static Task<int> Audit(DbConnection c,DbTransaction tx,Guid actor,string action,Guid target,string note,CancellationToken ct)=>Write(c,tx,"INSERT INTO staff_audit_logs(actor_id,action,target_id,note) VALUES(@actor,@action,@target,@note)",ct,("actor",actor),("action",action),("target",target),("note",note.Trim()));
    private async Task<PagedResult<JsonElement>> Page(string select, string from, PageQuery p,CancellationToken ct, params (string,object?)[] args)
    {
        await using var c=await factory.OpenConnectionAsync(ct);
        await using var count=c.CreateCommand(); count.CommandText="SELECT count(*) "+from;
        foreach(var (k,v) in args)count.AddParameter(k,v);
        var total=checked((int)(long)(await count.ExecuteScalarAsync(ct))!);
        var rows=await Rows(c,"SELECT row_to_json(x)::text FROM ("+select+" "+from+" ORDER BY created_at DESC,id DESC LIMIT @limit OFFSET @offset) x",ct,[..args,("limit",p.PageSize),("offset",p.Offset)]);
        return new(rows,p.Page,p.PageSize,total);
    }
    public Task<PagedResult<JsonElement>> Users(string? q,string? role,PageQuery p,CancellationToken ct)=>Page("""
        SELECT u.id,u.email,u.role,u.is_active AS "isActive",u.created_at,p.display_name AS "displayName",p.avatar_url AS "avatarUrl",p.city,p.is_verified AS "isVerified",
          EXISTS(SELECT 1 FROM subscriptions s WHERE s.user_id=u.id AND s.plan='premium' AND s.status='active' AND s.ends_at>now()) AS "isPremium"
        ""","FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE (CAST(@role AS text) IS NULL OR u.role=@role OR (@role='staff' AND u.role IN ('admin','moderator'))) AND (CAST(@q AS text) IS NULL OR position(lower(@q) in lower(u.email||' '||coalesce(p.display_name,'')))>0)",p,ct,("q",string.IsNullOrWhiteSpace(q)?null:q.Trim()),("role",role));
    public async Task<JsonElement> Overview(CancellationToken ct)
    {
        await using var c=await factory.OpenConnectionAsync(ct);
        return (await Rows(c,"SELECT jsonb_build_object('pendingRooms',(SELECT count(*) FROM rooms WHERE deleted_at IS NULL AND moderation_status='pending'),'openDisputes',(SELECT count(*) FROM disputes WHERE status IN ('open','investigating')),'groups',(SELECT count(*) FROM housing_groups),'openReports',(SELECT count(*) FROM user_reports WHERE status='open'),'pendingVerifications',(SELECT count(*) FROM identity_verifications WHERE status='pending'))::text",ct))[0];
    }
    public async Task<JsonElement> User(Guid id,CancellationToken ct)
    {
        await using var c=await factory.OpenConnectionAsync(ct);
        var rows=await Rows(c,"""
          SELECT jsonb_build_object('id',u.id,'email',u.email,'role',u.role,'isActive',u.is_active,'createdAt',u.created_at,'profile',to_jsonb(p),'lifestyle',to_jsonb(l),'roomCount',(SELECT count(*) FROM rooms WHERE owner_user_id=u.id AND deleted_at IS NULL),'reportCount',(SELECT count(*) FROM user_reports WHERE reported_user_id=u.id),'isPremium',EXISTS(SELECT 1 FROM subscriptions s WHERE s.user_id=u.id AND s.plan='premium' AND s.status='active' AND s.ends_at>now()))::text
          FROM users u LEFT JOIN profiles p ON p.user_id=u.id LEFT JOIN lifestyle_preferences l ON l.user_id=u.id WHERE u.id=@id
          """,ct,("id",id));
        return rows.FirstOrDefault().ValueKind==JsonValueKind.Undefined?throw new WorkspaceException(404,"Không tìm thấy thành viên."):rows[0];
    }
    public async Task Access(Guid actor,Guid id,AccountAccessRequest req,CancellationToken ct)
    {
        Text(req.Note,5,2000);
        if(actor==id)throw new WorkspaceException(409,"Không thể tự đổi quyền hoặc khóa tài khoản đang sử dụng.");
        await using var c=await factory.OpenConnectionAsync(ct); await using var tx=await c.BeginTransactionAsync(ct);
        await Write(c,tx,"SELECT pg_advisory_xact_lock(704123982)",ct);
        await using var cmd=c.CreateCommand(); cmd.Transaction=tx;
        cmd.CommandText="SELECT role,is_active,(SELECT count(*) FROM users WHERE role='admin' AND is_active) FROM users WHERE id=@id FOR UPDATE";cmd.AddParameter("id",id);
        string oldRole;bool active;long admins;
        await using(var r=await cmd.ExecuteReaderAsync(ct)){if(!await r.ReadAsync(ct))throw new WorkspaceException(404,"Không tìm thấy thành viên.");oldRole=r.GetString(0);active=r.GetBoolean(1);admins=r.GetInt64(2);}
        if(oldRole=="admin"&&active&&admins<=1&&(req.Role!="admin"||!req.IsActive))throw new WorkspaceException(409,"Phải giữ ít nhất một quản trị viên đang hoạt động.");
        if(oldRole==req.Role&&active==req.IsActive)throw new WorkspaceException(409,"Quyền và trạng thái chưa thay đổi.");
        await Write(c,tx,"UPDATE users SET role=@role,is_active=@active,token_version=token_version+1,updated_at=now() WHERE id=@id; UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=@id AND revoked_at IS NULL",ct,("role",req.Role),("active",req.IsActive),("id",id));
        await Audit(c,tx,actor,"account.access",id,$"{oldRole}/{active} → {req.Role}/{req.IsActive}. {req.Note}",ct);await tx.CommitAsync(ct);
    }
    public Task<PagedResult<JsonElement>> Rooms(string? status,Guid? id,PageQuery p,CancellationToken ct)=>Page("SELECT r.id,r.title,r.description,r.address,r.city,r.district,r.monthly_rent AS \"monthlyRent\",r.deposit,r.property_type AS \"propertyType\",r.bedrooms,r.area_m2 AS \"areaM2\",r.max_occupants AS \"maxOccupants\",r.roommates_needed AS \"roommatesNeeded\",r.available_from AS \"availableFrom\",r.amenities,r.latitude,r.longitude,r.is_active AS \"isActive\",r.owner_user_id AS \"ownerUserId\",p.display_name AS \"ownerName\",r.moderation_status AS status,r.moderation_note AS note,r.updated_at AS \"updatedAt\",r.created_at","FROM rooms r LEFT JOIN profiles p ON p.user_id=r.owner_user_id WHERE r.deleted_at IS NULL AND (CAST(@status AS text) IS NULL OR r.moderation_status=@status) AND (CAST(@id AS uuid) IS NULL OR r.id=@id)",p,ct,("status",status),("id",id));
    public async Task ReviewRoom(Guid actor,Guid id,RoomReviewRequest req,CancellationToken ct)
    {
        Text(req.Note,5,2000);
        await using var c=await factory.OpenConnectionAsync(ct);await using var tx=await c.BeginTransactionAsync(ct);
        var changed=await Write(c,tx,"UPDATE rooms SET moderation_status=@status,moderation_note=@note,reviewed_by=@actor,reviewed_at=now() WHERE id=@id AND deleted_at IS NULL AND updated_at=@version AND moderation_status<>@status",ct,("id",id),("status",req.Status),("note",req.Note.Trim()),("actor",actor),("version",req.ExpectedUpdatedAt));
        if(changed==0)throw new WorkspaceException(409,"Tin đã thay đổi hoặc đã được xử lý. Tải lại trước khi duyệt.");
        await Audit(c,tx,actor,"room."+req.Status,id,req.Note,ct);await tx.CommitAsync(ct);
    }
    public Task<PagedResult<JsonElement>> Logs(PageQuery p,CancellationToken ct)=>Page("SELECT a.id,a.action,a.target_id AS \"targetId\",a.note,a.created_at,p.display_name AS \"actorName\"","FROM staff_audit_logs a LEFT JOIN profiles p ON p.user_id=a.actor_id",p,ct);
    public Task<PagedResult<JsonElement>> Groups(Guid user,bool staff,PageQuery p,CancellationToken ct)=>Page("SELECT g.id,g.name,g.room_id AS \"roomId\",g.created_at,(SELECT count(*) FROM housing_group_members m WHERE m.group_id=g.id AND m.status='active') AS \"memberCount\",(SELECT role FROM housing_group_members m WHERE m.group_id=g.id AND m.user_id=@user) AS \"myRole\",(SELECT status FROM housing_group_members m WHERE m.group_id=g.id AND m.user_id=@user) AS \"myStatus\"","FROM housing_groups g WHERE @staff OR EXISTS(SELECT 1 FROM housing_group_members m WHERE m.group_id=g.id AND m.user_id=@user)",p,ct,("user",user),("staff",staff));
    private static async Task<string> GroupPermission(DbConnection c,DbTransaction? tx,Guid group,Guid user,CancellationToken ct)
    {
        await using var cmd=c.CreateCommand();cmd.Transaction=tx;cmd.CommandText="SELECT role FROM housing_group_members WHERE group_id=@g AND user_id=@u AND status='active'";cmd.AddParameter("g",group).AddParameter("u",user);
        return await cmd.ExecuteScalarAsync(ct) as string ?? throw new WorkspaceException(403,"Bạn chưa là thành viên chính thức của nhóm.");
    }
    public async Task<JsonElement> Group(Guid group,Guid user,bool staff,CancellationToken ct)
    {
        await using var c=await factory.OpenConnectionAsync(ct);if(!staff)await GroupPermission(c,null,group,user,ct);
        var rows=await Rows(c,"""
          SELECT jsonb_build_object('id',g.id,'name',g.name,'roomId',g.room_id,'members',coalesce((SELECT jsonb_agg(jsonb_build_object('userId',m.user_id,'displayName',p.display_name,'avatarUrl',p.avatar_url,'role',m.role,'status',m.status) ORDER BY m.joined_at) FROM housing_group_members m LEFT JOIN profiles p ON p.user_id=m.user_id WHERE m.group_id=g.id),'[]'::jsonb))::text FROM housing_groups g WHERE g.id=@g
          """,ct,("g",group));return rows.Count==0?throw new WorkspaceException(404,"Không tìm thấy nhóm."):rows[0];
    }
    public async Task<Guid> CreateGroup(Guid user,GroupCreateRequest req,CancellationToken ct)
    {
        Text(req.Name,3,160);
        await using var c=await factory.OpenConnectionAsync(ct);await using var tx=await c.BeginTransactionAsync(ct);
        if(req.RoomId is {} room){await using var check=c.CreateCommand();check.Transaction=tx;check.CommandText="SELECT 1 FROM rooms WHERE id=@id AND owner_user_id=@u AND deleted_at IS NULL";check.AddParameter("id",room).AddParameter("u",user);if(await check.ExecuteScalarAsync(ct) is null)throw new WorkspaceException(403,"Chỉ chủ tin có thể lập nhóm gắn với phòng.");}
        var id=Guid.NewGuid();await Write(c,tx,"INSERT INTO housing_groups(id,name,room_id,created_by) SELECT @id,@name,@room,@u WHERE NOT EXISTS(SELECT 1 FROM housing_groups WHERE room_id=@room)",ct,("id",id),("name",req.Name.Trim()),("room",req.RoomId),("u",user));
        await using(var exists=c.CreateCommand()){exists.Transaction=tx;exists.CommandText="SELECT 1 FROM housing_groups WHERE id=@id";exists.AddParameter("id",id);if(await exists.ExecuteScalarAsync(ct) is null)throw new WorkspaceException(409,"Phòng đã có nhóm.");}
        await Write(c,tx,"INSERT INTO housing_group_members(group_id,user_id,role,status) VALUES(@g,@u,'owner','active')",ct,("g",id),("u",user));await tx.CommitAsync(ct);return id;
    }
    public async Task Invite(Guid group,Guid actor,string email,CancellationToken ct)
    {
        await using var c=await factory.OpenConnectionAsync(ct);await using var tx=await c.BeginTransactionAsync(ct);
        var role=await GroupPermission(c,tx,group,actor,ct);if(role=="member")throw new WorkspaceException(403,"Chỉ chủ nhóm/người quản lý được mời thành viên.");
        await using var find=c.CreateCommand();find.Transaction=tx;find.CommandText="SELECT id FROM users WHERE lower(email)=lower(@email) AND is_active";find.AddParameter("email",email.Trim());var target=await find.ExecuteScalarAsync(ct);if(target is null)throw new WorkspaceException(404,"Không tìm thấy tài khoản đang hoạt động với email này.");
        var n=await Write(c,tx,"INSERT INTO housing_group_members(group_id,user_id,role,status) VALUES(@g,@u,'member','invited') ON CONFLICT DO NOTHING",ct,("g",group),("u",target));if(n==0)throw new WorkspaceException(409,"Tài khoản đã ở trong nhóm hoặc đang được mời.");await tx.CommitAsync(ct);
    }
    public async Task RespondInvite(Guid group,Guid user,bool accept,CancellationToken ct)
    {
        await using var c=await factory.OpenConnectionAsync(ct);await using var tx=await c.BeginTransactionAsync(ct);
        var n=await Write(c,tx,accept?"UPDATE housing_group_members SET status='active',joined_at=now() WHERE group_id=@g AND user_id=@u AND status='invited'":"DELETE FROM housing_group_members WHERE group_id=@g AND user_id=@u AND status='invited'",ct,("g",group),("u",user));if(n==0)throw new WorkspaceException(404,"Không có lời mời đang chờ.");await tx.CommitAsync(ct);
    }
    public async Task GroupRole(Guid group,Guid actor,Guid target,string? role,bool staff,CancellationToken ct)
    {
        await using var c=await factory.OpenConnectionAsync(ct);await using var tx=await c.BeginTransactionAsync(ct);
        // Serialize all owner transfers/removals inside a group.
        await Write(c,tx,"SELECT id FROM housing_groups WHERE id=@g FOR UPDATE",ct,("g",group));
        if(!staff){var own=await GroupPermission(c,tx,group,actor,ct);if(own!="owner")throw new WorkspaceException(403,"Chỉ chủ nhóm được phân quyền hoặc xóa thành viên.");}
        await using var check=c.CreateCommand();check.Transaction=tx;check.CommandText="SELECT role FROM housing_group_members WHERE group_id=@g AND user_id=@u AND (@remove OR status='active')";check.AddParameter("remove",role is null);check.AddParameter("g",group).AddParameter("u",target);var old=await check.ExecuteScalarAsync(ct) as string;if(old is null)throw new WorkspaceException(404,"Không tìm thấy thành viên chính thức.");
        if(old=="owner")throw new WorkspaceException(409,"Chuyển quyền sở hữu cho thành viên khác trước khi thay đổi chủ nhóm.");
        if(role=="owner")await Write(c,tx,"UPDATE housing_group_members SET role='manager' WHERE group_id=@g AND role='owner'",ct,("g",group));
        await Write(c,tx,role is null?"DELETE FROM housing_group_members WHERE group_id=@g AND user_id=@u":"UPDATE housing_group_members SET role=@role WHERE group_id=@g AND user_id=@u",ct,("g",group),("u",target),("role",role));
        await Audit(c,tx,actor,"group.member",group,$"{target}: {old} → {role??"removed"}",ct);await tx.CommitAsync(ct);
    }
    public async Task LeaveGroup(Guid group,Guid user,CancellationToken ct)
    {
        await using var c=await factory.OpenConnectionAsync(ct);await using var tx=await c.BeginTransactionAsync(ct);
        await Write(c,tx,"SELECT id FROM housing_groups WHERE id=@g FOR UPDATE",ct,("g",group));
        var role=await GroupPermission(c,tx,group,user,ct);
        if(role=="owner")throw new WorkspaceException(409,"Chuyển quyền chủ nhóm trước khi rời nhóm.");
        await Write(c,tx,"DELETE FROM housing_group_members WHERE group_id=@g AND user_id=@u",ct,("g",group),("u",user));
        await Audit(c,tx,user,"group.leave",group,"Thành viên tự rời nhóm.",ct);await tx.CommitAsync(ct);
    }
    public Task<PagedResult<JsonElement>> Disputes(Guid user,bool staff,string? status,PageQuery p,CancellationToken ct)=>Page("SELECT d.id,d.title,d.details,d.status,d.resolution_note AS \"resolutionNote\",d.complainant_id AS \"complainantId\",d.respondent_id AS \"respondentId\",d.room_id AS \"roomId\",d.group_id AS \"groupId\",d.created_at,p.display_name AS \"complainantName\",r.display_name AS \"respondentName\"","FROM disputes d LEFT JOIN profiles p ON p.user_id=d.complainant_id LEFT JOIN profiles r ON r.user_id=d.respondent_id WHERE (@staff OR d.complainant_id=@user OR d.respondent_id=@user) AND (CAST(@status AS text) IS NULL OR d.status=@status)",p,ct,("user",user),("staff",staff),("status",status));
    public async Task<Guid> CreateDispute(Guid user,DisputeCreateRequest req,CancellationToken ct)
    {
        Text(req.Title,5,180);Text(req.Details,20,5000);
        if(user==req.RespondentId)throw new WorkspaceException(400,"Không thể tạo tranh chấp với chính mình.");
        await using var c=await factory.OpenConnectionAsync(ct);await using var tx=await c.BeginTransactionAsync(ct);
        await using(var check=c.CreateCommand()){check.Transaction=tx;check.CommandText="SELECT 1 FROM users WHERE id=@id AND is_active";check.AddParameter("id",req.RespondentId);if(await check.ExecuteScalarAsync(ct) is null)throw new WorkspaceException(404,"Không tìm thấy bên liên quan.");}
        if(req.GroupId is {} g){await GroupPermission(c,tx,g,user,ct);await GroupPermission(c,tx,g,req.RespondentId,ct);}
        if(req.RoomId is {} room){await using var check=c.CreateCommand();check.Transaction=tx;check.CommandText="SELECT 1 FROM rooms WHERE id=@r AND deleted_at IS NULL AND owner_user_id IN (@u,@v)";check.AddParameter("r",room).AddParameter("u",user).AddParameter("v",req.RespondentId);if(await check.ExecuteScalarAsync(ct) is null)throw new WorkspaceException(400,"Phòng không liên quan đến hai bên tranh chấp.");}
        var id=Guid.NewGuid();await Write(c,tx,"INSERT INTO disputes(id,complainant_id,respondent_id,room_id,group_id,title,details) VALUES(@id,@u,@v,@r,@g,@title,@details)",ct,("id",id),("u",user),("v",req.RespondentId),("r",req.RoomId),("g",req.GroupId),("title",req.Title.Trim()),("details",req.Details.Trim()));await tx.CommitAsync(ct);return id;
    }
    public async Task<JsonElement> Dispute(Guid id,Guid user,bool staff,CancellationToken ct)
    {
        await using var c=await factory.OpenConnectionAsync(ct);var rows=await Rows(c,"""
          SELECT jsonb_build_object('id',d.id,'title',d.title,'details',d.details,'status',d.status,'resolutionNote',d.resolution_note,'complainantId',d.complainant_id,'respondentId',d.respondent_id,'complainantName',p.display_name,'respondentName',r.display_name,'roomId',d.room_id,'groupId',d.group_id,'messages',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'content',m.content,'authorName',a.display_name,'createdAt',m.created_at) ORDER BY m.created_at,m.id) FROM dispute_messages m LEFT JOIN profiles a ON a.user_id=m.author_id WHERE m.dispute_id=d.id),'[]'::jsonb))::text
          FROM disputes d LEFT JOIN profiles p ON p.user_id=d.complainant_id LEFT JOIN profiles r ON r.user_id=d.respondent_id WHERE d.id=@id AND (@staff OR d.complainant_id=@u OR d.respondent_id=@u)
          """,ct,("id",id),("u",user),("staff",staff));return rows.Count==0?throw new WorkspaceException(404,"Không tìm thấy tranh chấp hoặc bạn không được truy cập."):rows[0];
    }
    public async Task Message(Guid id,Guid user,bool staff,string content,CancellationToken ct)
    {
        if(string.IsNullOrWhiteSpace(content))throw new WorkspaceException(400,"Nhập nội dung phản hồi.");
        await using var c=await factory.OpenConnectionAsync(ct);await using var tx=await c.BeginTransactionAsync(ct);
        await Write(c,tx,"SELECT id FROM disputes WHERE id=@id FOR UPDATE",ct,("id",id));
        var n=await Write(c,tx,"INSERT INTO dispute_messages(dispute_id,author_id,content) SELECT id,@u,@content FROM disputes WHERE id=@id AND status IN ('open','investigating') AND (@staff OR complainant_id=@u OR respondent_id=@u)",ct,("id",id),("u",user),("staff",staff),("content",content.Trim()));if(n==0)throw new WorkspaceException(409,"Tranh chấp đã đóng hoặc bạn không có quyền phản hồi.");await tx.CommitAsync(ct);
    }
    public async Task ReviewDispute(Guid id,Guid actor,DisputeReviewRequest req,CancellationToken ct)
    {
        Text(req.Note,5,2000);
        await using var c=await factory.OpenConnectionAsync(ct);await using var tx=await c.BeginTransactionAsync(ct);
        var n=await Write(c,tx,"UPDATE disputes SET status=@status,resolution_note=@note,reviewed_by=@u,updated_at=now() WHERE id=@id AND status IN ('open','investigating') AND complainant_id<>@u AND respondent_id<>@u",ct,("id",id),("u",actor),("status",req.Status),("note",req.Note.Trim()));if(n==0)throw new WorkspaceException(409,"Tranh chấp đã đóng hoặc bạn là bên liên quan và không được tự xử lý.");await Audit(c,tx,actor,"dispute."+req.Status,id,req.Note,ct);await tx.CommitAsync(ct);
    }
}
