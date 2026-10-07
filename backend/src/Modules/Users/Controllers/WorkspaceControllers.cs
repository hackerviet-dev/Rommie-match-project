using System.Text.Json;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Controllers;

public sealed class WorkspaceErrorFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if(context.Exception is WorkspaceException e){context.Result=new ObjectResult(new ProblemDetails{Status=e.Status,Title="Không thể thực hiện thao tác",Detail=e.Message}){StatusCode=e.Status};context.ExceptionHandled=true;}
        // Trigger 024 backs the service-side pair limit when two invites race.
        else if(context.Exception is System.Data.Common.DbException g && g.SqlState=="23514" && g.Message.Contains("housing group")) {context.Result=new ConflictObjectResult(new ProblemDetails{Status=409,Title="Không thể thực hiện thao tác",Detail="Nhóm ở ghép chỉ gồm tối đa 2 người, tính cả lời mời đang chờ."});context.ExceptionHandled=true;}
        else if(context.Exception is System.Data.Common.DbException p && p.SqlState is "23505" or "23503") {context.Result=new ConflictObjectResult(new ProblemDetails{Status=409,Title="Dữ liệu đã thay đổi",Detail="Dữ liệu liên quan đã thay đổi hoặc bị trùng. Tải lại và thử lại."});context.ExceptionHandled=true;}
    }
}

[ApiController,Authorize(Roles="admin,moderator"),Route("api/admin"),TypeFilter(typeof(WorkspaceErrorFilter))]
public sealed class StaffWorkspaceController(WorkspaceService service) : ControllerBase
{
    [HttpGet("workspace-stats")]
    public Task<JsonElement> Overview(CancellationToken ct)=>service.Overview(ct);
    [HttpGet("users")]
    public Task<PagedResult<JsonElement>> Users([FromQuery]PageQuery p,[FromQuery,StringLength(120)]string? q,[FromQuery,RegularExpression("^(member|moderator|admin|staff)$")]string? role,CancellationToken ct)=>service.Users(q,role,p,ct);
    [HttpGet("users/{id:guid}")]
    public Task<JsonElement> UserDetail(Guid id,CancellationToken ct)=>service.User(id,ct);
    [HttpPut("users/{id:guid}/access"),Authorize(Roles="admin")]
    public async Task<IActionResult> Access(Guid id,AccountAccessRequest req,CancellationToken ct){await service.Access(User.GetUserId()!.Value,id,req,ct);return NoContent();}
    [HttpGet("rooms")]
    public Task<PagedResult<JsonElement>> Rooms([FromQuery]PageQuery p,[FromQuery,RegularExpression("^(pending|approved|rejected)$")]string? status,[FromQuery]Guid? id,CancellationToken ct)=>service.Rooms(status,id,p,ct);
    [HttpPost("rooms/{id:guid}/review")]
    public async Task<IActionResult> RoomReview(Guid id,RoomReviewRequest req,CancellationToken ct){await service.ReviewRoom(User.GetUserId()!.Value,id,req,ct);return NoContent();}
    [HttpGet("groups")]
    public Task<PagedResult<JsonElement>> Groups([FromQuery]PageQuery p,CancellationToken ct)=>service.Groups(User.GetUserId()!.Value,true,p,ct);
    [HttpGet("groups/{id:guid}")]
    public Task<JsonElement> Group(Guid id,CancellationToken ct)=>service.Group(id,User.GetUserId()!.Value,true,ct);
    [HttpPut("groups/{id:guid}/members/{userId:guid}/role"),Authorize(Roles="admin")]
    public async Task<IActionResult> Role(Guid id,Guid userId,GroupRoleRequest req,CancellationToken ct){await service.GroupRole(id,User.GetUserId()!.Value,userId,req.Role,true,ct);return NoContent();}
    [HttpGet("disputes")]
    public Task<PagedResult<JsonElement>> Disputes([FromQuery]PageQuery p,[FromQuery,RegularExpression("^(open|investigating|resolved|dismissed)$")]string? status,CancellationToken ct)=>service.Disputes(User.GetUserId()!.Value,true,status,p,ct);
    [HttpGet("disputes/{id:guid}")]
    public Task<JsonElement> Dispute(Guid id,CancellationToken ct)=>service.Dispute(id,User.GetUserId()!.Value,true,ct);
    [HttpPost("disputes/{id:guid}/messages")]
    public async Task<IActionResult> Message(Guid id,DisputeMessageRequest req,CancellationToken ct){await service.Message(id,User.GetUserId()!.Value,true,req.Content,ct);return NoContent();}
    [HttpPost("disputes/{id:guid}/review")]
    public async Task<IActionResult> Review(Guid id,DisputeReviewRequest req,CancellationToken ct){await service.ReviewDispute(id,User.GetUserId()!.Value,req,ct);return NoContent();}
    [HttpGet("audit-logs"),Authorize(Roles="admin")]
    public Task<PagedResult<JsonElement>> Logs([FromQuery]PageQuery p,CancellationToken ct)=>service.Logs(p,ct);
}

[ApiController,Authorize,Route("api/groups"),TypeFilter(typeof(WorkspaceErrorFilter))]
public sealed class HousingGroupsController(WorkspaceService service) : ControllerBase
{
    [HttpGet("me")]
    public Task<PagedResult<JsonElement>> Mine([FromQuery]PageQuery p,CancellationToken ct)=>service.Groups(User.GetUserId()!.Value,false,p,ct);
    [HttpPost]
    public async Task<IActionResult> Create(GroupCreateRequest req,CancellationToken ct){var id=await service.CreateGroup(User.GetUserId()!.Value,req,ct);return Created($"/api/groups/{id}",new{id});}
    [HttpGet("{id:guid}")]
    public Task<JsonElement> Detail(Guid id,CancellationToken ct)=>service.Group(id,User.GetUserId()!.Value,false,ct);
    [HttpPost("{id:guid}/invitations")]
    public async Task<IActionResult> Invite(Guid id,GroupInviteRequest req,CancellationToken ct){await service.Invite(id,User.GetUserId()!.Value,req.Email,ct);return NoContent();}
    [HttpPost("{id:guid}/leave")]
    public async Task<IActionResult> Leave(Guid id,CancellationToken ct){await service.LeaveGroup(id,User.GetUserId()!.Value,ct);return NoContent();}
    [HttpPost("{id:guid}/accept")]
    public async Task<IActionResult> Accept(Guid id,CancellationToken ct){await service.RespondInvite(id,User.GetUserId()!.Value,true,ct);return NoContent();}
    [HttpPost("{id:guid}/decline")]
    public async Task<IActionResult> Decline(Guid id,CancellationToken ct){await service.RespondInvite(id,User.GetUserId()!.Value,false,ct);return NoContent();}
    [HttpPut("{id:guid}/members/{userId:guid}/role")]
    public async Task<IActionResult> Role(Guid id,Guid userId,GroupRoleRequest req,CancellationToken ct){await service.GroupRole(id,User.GetUserId()!.Value,userId,req.Role,false,ct);return NoContent();}
    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> Remove(Guid id,Guid userId,CancellationToken ct){await service.GroupRole(id,User.GetUserId()!.Value,userId,null,false,ct);return NoContent();}
}

[ApiController,Authorize,Route("api/disputes"),TypeFilter(typeof(WorkspaceErrorFilter))]
public sealed class DisputesController(WorkspaceService service) : ControllerBase
{
    [HttpGet("me")]
    public Task<PagedResult<JsonElement>> Mine([FromQuery]PageQuery p,CancellationToken ct)=>service.Disputes(User.GetUserId()!.Value,false,null,p,ct);
    [HttpPost]
    public async Task<IActionResult> Create(DisputeCreateRequest req,CancellationToken ct){var id=await service.CreateDispute(User.GetUserId()!.Value,req,ct);return Created($"/api/disputes/{id}",new{id});}
    [HttpGet("{id:guid}")]
    public Task<JsonElement> Detail(Guid id,CancellationToken ct)=>service.Dispute(id,User.GetUserId()!.Value,false,ct);
    [HttpPost("{id:guid}/messages")]
    public async Task<IActionResult> Message(Guid id,DisputeMessageRequest req,CancellationToken ct){await service.Message(id,User.GetUserId()!.Value,false,req.Content,ct);return NoContent();}
}
