using System.ComponentModel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController, Authorize(Roles = "admin,moderator"), Route("api/admin")]
public sealed class AdminController(AdminService service) : ControllerBase
{
    [Authorize(Roles = "admin")]
    [EndpointSummary("Thống kê dashboard quản trị")]
    [EndpointDescription("Chỉ role admin. 200 trả AdminStatsDto gồm số tài khoản, báo cáo và xác minh; 403: thiếu quyền.")]
    [ProducesResponseType(403, Description = "Không đủ quyền hoặc không thỏa điều kiện; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(typeof(AdminStatsDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("stats")]
    public Task<AdminStatsDto> Stats(CancellationToken ct) => service.GetStatsAsync(ct);

    [EndpointSummary("Danh sách báo cáo cần kiểm duyệt")]
    [EndpointDescription("Cần role admin hoặc moderator. 200 trả PagedResult<AdminReportDto>, mới nhất trước. status tùy chọn open/resolved/dismissed; 400 nếu sai giá trị.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(typeof(PagedResult<AdminReportDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("reports")]
    public async Task<ActionResult<PagedResult<AdminReportDto>>> Reports(
        [FromQuery] PageQuery paging, [FromQuery] [Description("Lọc trạng thái: open, resolved, dismissed; bỏ trống để lấy tất cả.")] string? status, CancellationToken ct)
    {
        if (status is not null && status is not ("open" or "resolved" or "dismissed"))
            return BadRequest("Trạng thái báo cáo không hợp lệ.");
        return Ok(await service.GetReportsAsync(status, paging, ct));
    }

    [EndpointSummary("Xử lý một báo cáo")]
    [EndpointDescription("Cần role admin hoặc moderator. Gửi status=resolved hoặc dismissed, resolutionNote tùy chọn tối đa 2000 ký tự. 204: xử lý thành công, không có body; 400: dữ liệu sai; 404: không có báo cáo mở để xử lý.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(204, Description = "Thành công; không có body.")]
    [HttpPost("reports/{id:guid}/review")]
    public async Task<IActionResult> ReviewReport([Description("UUID báo cáo hoặc hồ sơ xác minh, lấy từ id trong danh sách tương ứng.")] Guid id, [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] ReviewReportRequest request, CancellationToken ct)
    {
        if (request.Status is not ("resolved" or "dismissed"))
            return BadRequest("Trạng thái báo cáo không hợp lệ.");
        if (request.ResolutionNote?.Length > 2000)
            return BadRequest("Ghi chú xử lý quá dài.");
        if (User.GetUserId() is not { } reviewer)
            return Unauthorized();
        return await service.ReviewReportAsync(id, reviewer, request, ct) ? NoContent() : NotFound();
    }

    [EndpointSummary("Danh sách hồ sơ xác minh")]
    [EndpointDescription("Cần role admin hoặc moderator. 200 trả PagedResult<AdminVerificationDto>. status tùy chọn pending/approved/rejected; 400 nếu sai giá trị.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(typeof(PagedResult<AdminVerificationDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("verifications")]
    public async Task<ActionResult<PagedResult<AdminVerificationDto>>> Verifications(
        [FromQuery] PageQuery paging, [FromQuery] [Description("Lọc trạng thái: pending, approved, rejected; bỏ trống để lấy tất cả.")] string? status, CancellationToken ct)
    {
        if (status is not null && status is not ("pending" or "approved" or "rejected"))
            return BadRequest("Trạng thái xác minh không hợp lệ.");
        return Ok(await service.GetVerificationsAsync(status, paging, ct));
    }

    [EndpointSummary("Duyệt hoặc từ chối xác minh")]
    [EndpointDescription("Cần role admin hoặc moderator. Gửi status=approved hoặc rejected; rejectionReason bắt buộc khi rejected, tối đa 2000 ký tự. 204: xử lý thành công; 400: dữ liệu sai; 404: không có hồ sơ pending để xử lý.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(204, Description = "Thành công; không có body.")]
    [HttpPost("verifications/{id:guid}/review")]
    public async Task<IActionResult> ReviewVerification([Description("UUID báo cáo hoặc hồ sơ xác minh, lấy từ id trong danh sách tương ứng.")] Guid id, [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] ReviewVerificationRequest request, CancellationToken ct)
    {
        if (request.Status is not ("approved" or "rejected"))
            return BadRequest("Trạng thái xác minh không hợp lệ.");
        if (request.Status == "rejected" && string.IsNullOrWhiteSpace(request.RejectionReason))
            return BadRequest("Cần lý do từ chối.");
        if (request.RejectionReason?.Length > 2000)
            return BadRequest("Lý do từ chối quá dài.");
        if (User.GetUserId() is not { } reviewer)
            return Unauthorized();
        return await service.ReviewVerificationAsync(id, reviewer, request, ct) ? NoContent() : NotFound();
    }
}
