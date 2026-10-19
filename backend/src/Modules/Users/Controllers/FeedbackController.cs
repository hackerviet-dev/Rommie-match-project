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
public sealed class FeedbackController(FeedbackService service) : ControllerBase
{
    [EndpointSummary("Gửi góp ý cho RoomieMatch")]
    [EndpointDescription("Cần đăng nhập. Gửi {category, message, rating?, pagePath?}. 201 trả FeedbackDto trạng thái new; kiểm duyệt viên xem qua GET /api/admin/feedback. 400: dữ liệu sai; 429 code feedback_rate_limited: đã gửi quá 5 góp ý trong một giờ.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(429, Description = "feedback_rate_limited: gửi quá nhiều góp ý trong một giờ.")]
    [ProducesResponseType(typeof(FeedbackDto), 201, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("api/feedback")]
    public async Task<ActionResult<FeedbackDto>> Create(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] CreateFeedbackRequest request,
        CancellationToken ct)
    {
        if (User.GetUserId() is not { } userId)
            return Unauthorized();
        var created = await service.CreateAsync(userId, request, ct);
        if (created is not null)
            return StatusCode(StatusCodes.Status201Created, created);

        var problem = ProblemDetailsFactory.CreateProblemDetails(HttpContext, StatusCodes.Status429TooManyRequests,
            detail: "Bạn đã gửi nhiều góp ý trong một giờ qua. Vui lòng thử lại sau.");
        problem.Extensions["code"] = "feedback_rate_limited";
        return new ObjectResult(problem)
        {
            StatusCode = StatusCodes.Status429TooManyRequests,
            ContentTypes = { "application/problem+json" }
        };
    }

    [Authorize(Roles = "admin,moderator")]
    [EndpointSummary("Danh sách góp ý của người dùng")]
    [EndpointDescription("Cần role admin hoặc moderator. 200 trả PagedResult<AdminFeedbackDto>, mới nhất trước. status tùy chọn new/reviewed, category tùy chọn bug/suggestion/praise/other; 400 nếu sai giá trị.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(typeof(PagedResult<AdminFeedbackDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("api/admin/feedback")]
    public async Task<ActionResult<PagedResult<AdminFeedbackDto>>> List(
        [FromQuery] PageQuery paging,
        [FromQuery] [Description("Lọc trạng thái: new, reviewed; bỏ trống để lấy tất cả.")] string? status,
        [FromQuery] [Description("Lọc loại: bug, suggestion, praise, other; bỏ trống để lấy tất cả.")] string? category,
        CancellationToken ct)
    {
        if (status is not null && status is not ("new" or "reviewed"))
            return BadRequest("Trạng thái góp ý không hợp lệ.");
        if (category is not null && category is not (FeedbackCategories.Bug or FeedbackCategories.Suggestion
                or FeedbackCategories.Praise or FeedbackCategories.Other))
            return BadRequest("Loại góp ý không hợp lệ.");
        return Ok(await service.ListAsync(status, category, paging, ct));
    }

    [Authorize(Roles = "admin,moderator")]
    [EndpointSummary("Đánh dấu đã xem một góp ý")]
    [EndpointDescription("Cần role admin hoặc moderator. Gửi staffNote tùy chọn tối đa 2000 ký tự. 204: đã chuyển sang reviewed và ghi nhật ký xử lý; 400: dữ liệu sai; 404: không có góp ý mới với id này.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(404, Description = "Không tìm thấy góp ý ở trạng thái new.")]
    [ProducesResponseType(204, Description = "Thành công; không có body.")]
    [HttpPost("api/admin/feedback/{id:guid}/review")]
    public async Task<IActionResult> Review(
        [Description("UUID góp ý, lấy từ id trong danh sách.")] Guid id,
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] ReviewFeedbackRequest request,
        CancellationToken ct)
    {
        if (User.GetUserId() is not { } reviewer)
            return Unauthorized();
        return await service.MarkReviewedAsync(id, reviewer, request.StaffNote, ct) ? NoContent() : NotFound();
    }
}
