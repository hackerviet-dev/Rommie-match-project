using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public sealed class SafetyController(ISafetyService safetyService) : ControllerBase
{
    [EndpointSummary("Chặn một thành viên")]
    [EndpointDescription("Cần đăng nhập; không có body. 204: đã chặn (chặn lại người đã chặn vẫn 204). Sau khi chặn, hai bên không thấy nhau ở hồ sơ, ghép đôi, tìm phòng; chat bị khóa (isBlocked=true) nhưng vẫn xem được lịch sử. 400 code self_target: tự chặn mình; 403 code staff_target: không chặn được tài khoản quản trị; 404: không có tài khoản.")]
    [ProducesResponseType(400, Description = "self_target: không thể tự chặn mình.")]
    [ProducesResponseType(403, Description = "staff_target: không thể chặn tài khoản quản trị/kiểm duyệt.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(204, Description = "Thành công; không có body.")]
    [HttpPost("{userId:guid}/block")]
    public async Task<IActionResult> Block(
        [Description("UUID thành viên muốn chặn.")] Guid userId,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } callerId)
        {
            return Unauthorized();
        }

        var error = await safetyService.BlockAsync(callerId, userId, cancellationToken);
        return error == SafetyError.None ? NoContent() : SafetyProblem(error);
    }

    [EndpointSummary("Bỏ chặn một thành viên")]
    [EndpointDescription("Cần đăng nhập; không có body. 204 kể cả khi chưa từng chặn người này. Bỏ chặn là xóa mềm; chỉ gỡ lần chặn của chính mình, nếu người kia cũng chặn mình thì hai bên vẫn ẩn với nhau.")]
    [ProducesResponseType(204, Description = "Thành công; không có body.")]
    [HttpDelete("{userId:guid}/block")]
    public async Task<IActionResult> Unblock(
        [Description("UUID thành viên muốn bỏ chặn, lấy từ GET /api/users/me/blocks.")] Guid userId,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } callerId)
        {
            return Unauthorized();
        }

        await safetyService.UnblockAsync(callerId, userId, cancellationToken);
        return NoContent();
    }

    [EndpointSummary("Danh sách người tôi đã chặn")]
    [EndpointDescription("Cần đăng nhập. 200 trả PagedResult<BlockedUserDto>, chặn gần nhất trước; dùng cho màn hình quản lý chặn/bỏ chặn.")]
    [ProducesResponseType(typeof(PagedResult<BlockedUserDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me/blocks")]
    public async Task<ActionResult<PagedResult<BlockedUserDto>>> GetMyBlocks(
        [FromQuery] PageQuery paging,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } callerId)
        {
            return Unauthorized();
        }

        return Ok(await safetyService.GetBlocksAsync(callerId, paging, cancellationToken));
    }

    [EndpointSummary("Báo cáo một thành viên")]
    [EndpointDescription("Cần đăng nhập. Gửi {reason, details?}; reason=other bắt buộc details. 201 trả UserReportDto trạng thái open, chờ kiểm duyệt viên xử lý qua /api/admin/reports. Báo cáo không tự chặn; muốn chặn thì gọi thêm POST /api/users/{userId}/block. 400: dữ liệu sai hoặc code self_target; 404: không có tài khoản; 409 code report_already_open: đã có báo cáo đang chờ xử lý với người này.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(409, Description = "report_already_open: đã có báo cáo đang chờ xử lý với thành viên này.")]
    [ProducesResponseType(typeof(UserReportDto), 201, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("{userId:guid}/reports")]
    public async Task<ActionResult<UserReportDto>> Report(
        [Description("UUID thành viên bị báo cáo.")] Guid userId,
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] CreateUserReportRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } callerId)
        {
            return Unauthorized();
        }

        var result = await safetyService.ReportAsync(callerId, userId, request, cancellationToken);
        return result.Error == SafetyError.None
            ? StatusCode(StatusCodes.Status201Created, result.Value)
            : SafetyProblem(result.Error);
    }

    [EndpointSummary("Báo cáo một tin phòng")]
    [EndpointDescription("Cần đăng nhập. Gửi {reason, details?} như báo cáo thành viên; reason=other bắt buộc details. Người bị báo cáo là chủ tin, báo cáo lưu kèm roomId để kiểm duyệt viên mở đúng tin qua /api/admin/reports. 201 trả UserReportDto trạng thái open. 400: dữ liệu sai hoặc code self_target (báo cáo tin của chính mình); 404 code room_not_found: không có tin phòng; 409 code report_already_open: đã có báo cáo đang chờ xử lý với tin này.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(404, Description = "room_not_found: không tìm thấy tin phòng.")]
    [ProducesResponseType(409, Description = "report_already_open: đã có báo cáo đang chờ xử lý với tin phòng này.")]
    [ProducesResponseType(typeof(UserReportDto), 201, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("/api/rooms/{roomId:guid}/reports")]
    public async Task<ActionResult<UserReportDto>> ReportRoom(
        [Description("UUID tin phòng bị báo cáo.")] Guid roomId,
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] CreateUserReportRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } callerId)
        {
            return Unauthorized();
        }

        var result = await safetyService.ReportRoomAsync(callerId, roomId, request, cancellationToken);
        return result.Error == SafetyError.None
            ? StatusCode(StatusCodes.Status201Created, result.Value)
            : SafetyProblem(result.Error);
    }

    // Same shape as the matching errors: a stable "code" next to the Vietnamese message.
    private ObjectResult SafetyProblem(SafetyError error)
    {
        var (status, code, detail) = error switch
        {
            SafetyError.NotFound => (StatusCodes.Status404NotFound, null, "Không tìm thấy thành viên."),
            SafetyError.Self => (StatusCodes.Status400BadRequest, "self_target",
                "Bạn không thể thực hiện thao tác này với chính mình."),
            SafetyError.StaffTarget => (StatusCodes.Status403Forbidden, "staff_target",
                "Không thể chặn tài khoản quản trị viên."),
            SafetyError.ReportAlreadyOpen => (StatusCodes.Status409Conflict, "report_already_open",
                "Bạn đã báo cáo nội dung này và báo cáo đang chờ xử lý."),
            SafetyError.RoomNotFound => (StatusCodes.Status404NotFound, "room_not_found",
                "Không tìm thấy tin phòng."),
            _ => throw new ArgumentOutOfRangeException(nameof(error), error, null)
        };

        var problem = ProblemDetailsFactory.CreateProblemDetails(HttpContext, status, detail: detail);
        if (code is not null)
        {
            problem.Extensions["code"] = code;
        }

        return new ObjectResult(problem)
        {
            StatusCode = status,
            ContentTypes = { "application/problem+json" }
        };
    }
}
