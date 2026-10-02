using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Matching.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Matching.Controllers;

[ApiController]
[Authorize]
[Route("api/matching/requests")]
public sealed class MatchRequestsController(IMatchRequestService requestService) : ControllerBase
{
    [EndpointSummary("Gửi lời mời ghép bạn cùng phòng")]
    [EndpointDescription("Cần đăng nhập. Gửi {candidateId, message?}. 201 trả MatchRequestDto trạng thái pending; người nhận chấp nhận thì thành accepted (ghép thành công). 400: dữ liệu sai hoặc code self_target; 404: thành viên không tồn tại, đang ẩn, bị khóa, là tài khoản quản trị hoặc có chặn giữa hai bên; 409 code match_request_pending (đã có lời mời đang chờ, theo một trong hai chiều) hoặc already_matched (đã ghép), kèm request là lời mời hiện có: direction=incoming nghĩa là người kia đã mời bạn, hãy chấp nhận lời mời đó.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ hoặc self_target.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(409, Description = "match_request_pending hoặc already_matched; problem details có request là lời mời hiện có.")]
    [ProducesResponseType(typeof(MatchRequestDto), 201, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost]
    public async Task<ActionResult<MatchRequestDto>> Create(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] CreateMatchRequestRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var result = await requestService.CreateAsync(userId, request, cancellationToken);
        return result.Error == MatchRequestError.None
            ? CreatedAtAction(nameof(Get), new { requestId = result.Request!.Id }, result.Request)
            : RequestProblem(result);
    }

    [EndpointSummary("Danh sách lời mời ghép của tôi")]
    [EndpointDescription("Cần đăng nhập. 200 trả PagedResult<MatchRequestDto>, thay đổi gần nhất trước. direction=incoming|outgoing, status=pending|accepted|declined|cancelled|ended; status=accepted là danh sách đã ghép thành công. Giá trị khác trả 400.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(typeof(PagedResult<MatchRequestDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet]
    public async Task<ActionResult<PagedResult<MatchRequestDto>>> GetMine(
        [FromQuery] MatchRequestQuery query,
        [FromQuery] PageQuery paging,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await requestService.GetMineAsync(userId, query, paging, cancellationToken));
    }

    [EndpointSummary("Xem một lời mời ghép")]
    [EndpointDescription("Cần đăng nhập. 200 trả MatchRequestDto; 404: không có hoặc không phải người gửi/người nhận.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(MatchRequestDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("{requestId:guid}")]
    public async Task<ActionResult<MatchRequestDto>> Get(
        [Description("UUID lời mời, lấy từ id trong danh sách lời mời.")] Guid requestId,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var request = await requestService.GetAsync(userId, requestId, cancellationToken);
        return request is null ? NotFound() : Ok(request);
    }

    [EndpointSummary("Chấp nhận lời mời ghép (xác nhận ghép thành công)")]
    [EndpointDescription("Cần đăng nhập; không có body; chỉ người nhận. 200 trả lời mời trạng thái accepted. 403 code recipient_only: bạn là người gửi; 403 code blocked: có chặn giữa hai bên; 404: không có lời mời; 409 code request_not_pending: lời mời đã được xử lý/huỷ.")]
    [ProducesResponseType(403, Description = "recipient_only hoặc blocked.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(409, Description = "request_not_pending: lời mời không còn ở trạng thái chờ.")]
    [ProducesResponseType(typeof(MatchRequestDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("{requestId:guid}/accept")]
    public Task<ActionResult<MatchRequestDto>> Accept(
        [Description("UUID lời mời, lấy từ id trong danh sách lời mời.")] Guid requestId,
        CancellationToken cancellationToken) =>
        Transition(requestId, MatchRequestAction.Accept, cancellationToken);

    [EndpointSummary("Từ chối lời mời ghép")]
    [EndpointDescription("Cần đăng nhập; không có body; chỉ người nhận. 200 trả lời mời trạng thái declined. 403 code recipient_only; 404: không có lời mời; 409 code request_not_pending.")]
    [ProducesResponseType(403, Description = "recipient_only: chỉ người nhận được từ chối.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(409, Description = "request_not_pending: lời mời không còn ở trạng thái chờ.")]
    [ProducesResponseType(typeof(MatchRequestDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("{requestId:guid}/decline")]
    public Task<ActionResult<MatchRequestDto>> Decline(
        [Description("UUID lời mời, lấy từ id trong danh sách lời mời.")] Guid requestId,
        CancellationToken cancellationToken) =>
        Transition(requestId, MatchRequestAction.Decline, cancellationToken);

    [EndpointSummary("Huỷ lời mời ghép đã gửi")]
    [EndpointDescription("Cần đăng nhập; không có body; chỉ người gửi, khi lời mời còn pending. 200 trả lời mời trạng thái cancelled. 403 code requester_only; 404: không có lời mời; 409 code request_not_pending.")]
    [ProducesResponseType(403, Description = "requester_only: chỉ người gửi được huỷ.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(409, Description = "request_not_pending: lời mời không còn ở trạng thái chờ.")]
    [ProducesResponseType(typeof(MatchRequestDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("{requestId:guid}/cancel")]
    public Task<ActionResult<MatchRequestDto>> Cancel(
        [Description("UUID lời mời, lấy từ id trong danh sách lời mời.")] Guid requestId,
        CancellationToken cancellationToken) =>
        Transition(requestId, MatchRequestAction.Cancel, cancellationToken);

    [EndpointSummary("Huỷ ghép (kết thúc ghép đã xác nhận)")]
    [EndpointDescription("Cần đăng nhập; không có body; một trong hai người, khi lời mời đang accepted. 200 trả lời mời trạng thái ended kèm endedAt/endedBy. Sau đó hai người có thể gửi lời mời mới. 404: không có lời mời; 409 code not_matched: chưa/không còn ghép.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(409, Description = "not_matched: lời mời không ở trạng thái accepted.")]
    [ProducesResponseType(typeof(MatchRequestDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("{requestId:guid}/end")]
    public Task<ActionResult<MatchRequestDto>> End(
        [Description("UUID lời mời, lấy từ id trong danh sách lời mời.")] Guid requestId,
        CancellationToken cancellationToken) =>
        Transition(requestId, MatchRequestAction.End, cancellationToken);

    private async Task<ActionResult<MatchRequestDto>> Transition(
        Guid requestId,
        MatchRequestAction action,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var result = await requestService.TransitionAsync(userId, requestId, action, cancellationToken);
        return result.Error == MatchRequestError.None ? Ok(result.Request) : RequestProblem(result);
    }

    // Problem details carry a stable "code" next to the Vietnamese message, and the current
    // request when it helps the app recover (show the invitation it collided with).
    private ObjectResult RequestProblem(MatchRequestResult result)
    {
        var (status, code, detail) = result.Error switch
        {
            MatchRequestError.NotFound => (StatusCodes.Status404NotFound, null, "Không tìm thấy lời mời hoặc thành viên."),
            MatchRequestError.Self => (StatusCodes.Status400BadRequest, "self_target",
                "Bạn không thể gửi lời mời ghép cho chính mình."),
            MatchRequestError.AlreadyPending => (StatusCodes.Status409Conflict, "match_request_pending",
                "Đã có lời mời ghép đang chờ giữa hai bạn."),
            MatchRequestError.AlreadyMatched => (StatusCodes.Status409Conflict, "already_matched",
                "Hai bạn đã được ghép làm bạn cùng phòng."),
            MatchRequestError.RecipientOnly => (StatusCodes.Status403Forbidden, "recipient_only",
                "Chỉ người nhận lời mời mới thực hiện được thao tác này."),
            MatchRequestError.RequesterOnly => (StatusCodes.Status403Forbidden, "requester_only",
                "Chỉ người gửi lời mời mới huỷ được."),
            MatchRequestError.NotPending => (StatusCodes.Status409Conflict, "request_not_pending",
                "Lời mời này đã được xử lý hoặc đã huỷ."),
            MatchRequestError.NotMatched => (StatusCodes.Status409Conflict, "not_matched",
                "Hai bạn hiện không ở trạng thái đã ghép."),
            MatchRequestError.Blocked => (StatusCodes.Status403Forbidden, "blocked",
                "Không thể ghép vì một trong hai bên đã chặn người kia."),
            _ => throw new ArgumentOutOfRangeException(nameof(result), result.Error, null)
        };

        var problem = ProblemDetailsFactory.CreateProblemDetails(HttpContext, status, detail: detail);
        if (code is not null)
        {
            problem.Extensions["code"] = code;
        }

        if (result.Request is not null)
        {
            problem.Extensions["request"] = result.Request;
        }

        return new ObjectResult(problem)
        {
            StatusCode = status,
            ContentTypes = { "application/problem+json" }
        };
    }
}
