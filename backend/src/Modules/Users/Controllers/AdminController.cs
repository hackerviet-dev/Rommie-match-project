using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController, Authorize(Roles = "admin,moderator"), Route("api/admin")]
public sealed class AdminController(AdminService service) : ControllerBase
{
    [HttpGet("stats")]
    public Task<AdminStatsDto> Stats(CancellationToken ct) => service.GetStatsAsync(ct);

    [HttpGet("reports")]
    public async Task<ActionResult<PagedResult<AdminReportDto>>> Reports(
        [FromQuery] PageQuery paging, [FromQuery] string? status, CancellationToken ct)
    {
        if (status is not null && status is not ("open" or "resolved" or "dismissed"))
            return BadRequest("Trạng thái báo cáo không hợp lệ.");
        return Ok(await service.GetReportsAsync(status, paging, ct));
    }

    [HttpPost("reports/{id:guid}/review")]
    public async Task<IActionResult> ReviewReport(Guid id, ReviewReportRequest request, CancellationToken ct)
    {
        if (request.Status is not ("resolved" or "dismissed"))
            return BadRequest("Trạng thái báo cáo không hợp lệ.");
        if (request.ResolutionNote?.Length > 2000)
            return BadRequest("Ghi chú xử lý quá dài.");
        if (User.GetUserId() is not { } reviewer)
            return Unauthorized();
        return await service.ReviewReportAsync(id, reviewer, request, ct) ? NoContent() : NotFound();
    }

    [HttpGet("verifications")]
    public async Task<ActionResult<PagedResult<AdminVerificationDto>>> Verifications(
        [FromQuery] PageQuery paging, [FromQuery] string? status, CancellationToken ct)
    {
        if (status is not null && status is not ("pending" or "approved" or "rejected"))
            return BadRequest("Trạng thái xác minh không hợp lệ.");
        return Ok(await service.GetVerificationsAsync(status, paging, ct));
    }

    [HttpPost("verifications/{id:guid}/review")]
    public async Task<IActionResult> ReviewVerification(Guid id, ReviewVerificationRequest request, CancellationToken ct)
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
