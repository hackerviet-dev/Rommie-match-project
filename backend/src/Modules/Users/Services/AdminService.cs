using System.ComponentModel;
using System.Data.Common;
using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Services;

public sealed class AdminService(IDbConnectionFactory factory)
{
    public async Task<AdminStatsDto> GetStatsAsync(CancellationToken ct)
    {
        await using var connection = await factory.OpenConnectionAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT (SELECT count(*) FROM users WHERE is_active),
                   (SELECT count(*) FROM user_reports WHERE status = 'open'),
                   (SELECT count(*) FROM identity_verifications WHERE status = 'pending'),
                   (SELECT count(*) FROM profiles WHERE is_verified),
                   (SELECT count(*) FROM users WHERE created_at >= now() - interval '30 days')
            """;
        await using var reader = await command.ExecuteReaderAsync(ct);
        await reader.ReadAsync(ct);
        return new AdminStatsDto(reader.GetInt64(0), reader.GetInt64(1), reader.GetInt64(2), reader.GetInt64(3), reader.GetInt64(4));
    }

    public Task<PagedResult<AdminReportDto>> GetReportsAsync(string? status, PageQuery paging, CancellationToken ct) =>
        GetPagedAsync<AdminReportDto>("""
            SELECT r.id, r.reporter_id, r.reported_user_id, r.reason, r.details, r.status,
                   r.resolution_note, r.created_at, r.reviewed_at,
                   COALESCE(pr.display_name, ''), COALESCE(pt.display_name, '')
            """, """
            FROM user_reports r
            LEFT JOIN profiles pr ON pr.user_id = r.reporter_id
            LEFT JOIN profiles pt ON pt.user_id = r.reported_user_id
            WHERE (CAST(@status AS text) IS NULL OR r.status = @status)
            """, "r", status, paging, static (r) => new AdminReportDto(
                r.GetGuid(0), r.GetGuid(1), r.GetGuid(2), r.GetString(3), r.IsDBNull(4) ? null : r.GetString(4),
                r.GetString(5), r.IsDBNull(6) ? null : r.GetString(6), r.GetFieldValue<DateTimeOffset>(7),
                r.IsDBNull(8) ? null : r.GetFieldValue<DateTimeOffset>(8), r.GetString(9), r.GetString(10)), ct);

    public Task<PagedResult<AdminVerificationDto>> GetVerificationsAsync(string? status, PageQuery paging, CancellationToken ct) =>
        GetPagedAsync<AdminVerificationDto>("""
            SELECT v.id, v.user_id, v.document_type, v.document_number_last4, v.front_image_url,
                   v.back_image_url, v.selfie_image_url, v.status, v.rejection_reason, v.created_at,
                   v.reviewed_at, COALESCE(p.display_name, '')
            """, """
            FROM identity_verifications v LEFT JOIN profiles p ON p.user_id = v.user_id
            WHERE (CAST(@status AS text) IS NULL OR v.status = @status)
            """, "v", status, paging, static (r) => new AdminVerificationDto(
                r.GetGuid(0), r.GetGuid(1), r.GetString(2), r.GetString(3), r.GetString(4), r.GetString(5),
                r.IsDBNull(6) ? null : r.GetString(6), r.GetString(7), r.IsDBNull(8) ? null : r.GetString(8),
                r.GetFieldValue<DateTimeOffset>(9), r.IsDBNull(10) ? null : r.GetFieldValue<DateTimeOffset>(10), r.GetString(11)), ct);

    public async Task<bool> ReviewReportAsync(Guid id, Guid reviewer, ReviewReportRequest request, CancellationToken ct)
    {
        await using var c = await factory.OpenConnectionAsync(ct); await using var cmd = c.CreateCommand();
        cmd.CommandText = "WITH updated AS (UPDATE user_reports SET status=@status, resolution_note=@note, reviewed_by=@reviewer, reviewed_at=now() WHERE id=@id AND status='open' RETURNING id) INSERT INTO staff_audit_logs(actor_id,action,target_id,note) SELECT @reviewer,'report.'||@status,id,COALESCE(@note,'') FROM updated";
        cmd.AddParameter("status", request.Status).AddParameter("note", request.ResolutionNote).AddParameter("reviewer", reviewer).AddParameter("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) == 1;
    }

    public async Task<bool> ReviewVerificationAsync(Guid id, Guid reviewer, ReviewVerificationRequest request, CancellationToken ct)
    {
        await using var c = await factory.OpenConnectionAsync(ct); await using var tx = await c.BeginTransactionAsync(ct);
        await using var cmd = c.CreateCommand(); cmd.Transaction = tx;
        cmd.CommandText = "UPDATE identity_verifications SET status=@status, rejection_reason=@reason, reviewed_by=@reviewer, reviewed_at=now() WHERE id=@id AND status='pending' RETURNING user_id";
        cmd.AddParameter("status", request.Status).AddParameter("reason", request.RejectionReason).AddParameter("reviewer", reviewer).AddParameter("id", id);
        var user = await cmd.ExecuteScalarAsync(ct); if (user is null) return false;
        if (request.Status == "approved")
        {
            await using var profile = c.CreateCommand(); profile.Transaction = tx;
            profile.CommandText = "UPDATE profiles SET is_verified=true WHERE user_id=@user";
            profile.AddParameter("user", user);
            await profile.ExecuteNonQueryAsync(ct);
        }
        await using var audit=c.CreateCommand();audit.Transaction=tx;
        audit.CommandText="INSERT INTO staff_audit_logs(actor_id,action,target_id,note) VALUES(@actor,@action,@id,@note)";
        audit.AddParameter("actor",reviewer).AddParameter("action","verification."+request.Status).AddParameter("id",id).AddParameter("note",request.RejectionReason??"Đã duyệt xác minh");
        await audit.ExecuteNonQueryAsync(ct);
        await tx.CommitAsync(ct); return true;
    }

    private async Task<PagedResult<T>> GetPagedAsync<T>(string columns, string fromWhere, string alias, string? status, PageQuery paging, Func<DbDataReader, T> map, CancellationToken ct)
    {
        await using var c = await factory.OpenConnectionAsync(ct);
        await using var count = c.CreateCommand();
        count.CommandText = $"SELECT count(*) {fromWhere}";
        count.AddParameter("status", status);
        var totalCount = checked((int)(long)(await count.ExecuteScalarAsync(ct))!);
        await using var cmd = c.CreateCommand();
        cmd.CommandText = $"{columns} {fromWhere} ORDER BY {alias}.created_at DESC, {alias}.id DESC LIMIT @limit OFFSET @offset";
        cmd.AddParameter("status", status).AddParameter("limit", paging.PageSize).AddParameter("offset", paging.Offset);
        var items = new List<T>(); await using var r = await cmd.ExecuteReaderAsync(ct); while (await r.ReadAsync(ct)) items.Add(map(r));
        return new PagedResult<T>(items, paging.Page, paging.PageSize, totalCount);
    }
}

public sealed record AdminStatsDto(long ActiveUsers, long OpenReports, long PendingVerifications, long VerifiedProfiles, long NewUsersLast30Days);
public sealed record AdminReportDto(Guid Id, Guid ReporterId, Guid ReportedUserId, string Reason, string? Details, string Status, string? ResolutionNote, DateTimeOffset CreatedAt, DateTimeOffset? ReviewedAt, string ReporterName, string ReportedUserName);
public sealed record AdminVerificationDto(Guid Id, Guid UserId, string DocumentType, string DocumentNumberLast4, string FrontImageUrl, string BackImageUrl, string? SelfieImageUrl, string Status, string? RejectionReason, DateTimeOffset CreatedAt, DateTimeOffset? ReviewedAt, string UserName);
public sealed record ReviewReportRequest([property: Description("resolved hoặc dismissed.")] string Status, [property: Description("Ghi chú xử lý báo cáo, tối đa 2000 ký tự; có thể null.")] string? ResolutionNote);
public sealed record ReviewVerificationRequest([property: Description("approved hoặc rejected.")] string Status, [property: Description("Lý do từ chối, tối đa 2000 ký tự; bắt buộc khi status=rejected.")] string? RejectionReason);
