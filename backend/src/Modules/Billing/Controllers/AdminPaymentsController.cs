using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Billing.Services;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Billing.Controllers;

// Read-only payment history and revenue for staff. Moderators may look; only admins resolve
// refunds (AdminRefundsController).
[ApiController]
[Authorize(Roles = "admin,moderator")]
[Route("api/admin/billing")]
public sealed class AdminPaymentsController(IBillingService billingService) : ControllerBase
{
    private static readonly string[] Statuses =
    [
        PaymentStatus.Pending, PaymentStatus.Paid, PaymentStatus.Failed, PaymentStatus.Expired, PaymentStatus.Refunded
    ];

    [EndpointSummary("Lịch sử thanh toán của mọi thành viên")]
    [EndpointDescription("Cần role admin hoặc moderator. 200 trả PagedResult<AdminPaymentDto>, mới nhất trước. status tùy chọn pending/paid/failed/expired/refunded; q tìm theo email hoặc tên hiển thị (tối đa 120 ký tự). 400 nếu sai giá trị.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(typeof(PagedResult<AdminPaymentDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("payments")]
    public async Task<ActionResult<PagedResult<AdminPaymentDto>>> Payments(
        [FromQuery] PageQuery paging,
        [FromQuery] [Description("Lọc trạng thái đơn; bỏ trống để lấy tất cả.")] string? status,
        [FromQuery] [Description("Tìm theo email hoặc tên hiển thị người mua.")] string? q,
        CancellationToken cancellationToken)
    {
        if (status is not null && !Statuses.Contains(status))
        {
            return Problem("Trạng thái đơn thanh toán không hợp lệ.", statusCode: StatusCodes.Status400BadRequest);
        }

        if (q is { Length: > 120 })
        {
            return Problem("Từ khóa tìm kiếm tối đa 120 ký tự.", statusCode: StatusCodes.Status400BadRequest);
        }

        return Ok(await billingService.GetAdminPaymentsAsync(status, q, paging, cancellationToken));
    }

    [EndpointSummary("Tổng quan doanh thu Premium")]
    [EndpointDescription("Cần role admin hoặc moderator. 200 trả RevenueSummaryDto: doanh thu chỉ tính đơn đang paid (đơn đã hoàn tiền tách riêng), doanh thu tháng này và 6 tháng gần nhất theo giờ Việt Nam, số tài khoản Premium còn hạn.")]
    [ProducesResponseType(typeof(RevenueSummaryDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("revenue")]
    public async Task<ActionResult<RevenueSummaryDto>> Revenue(CancellationToken cancellationToken)
    {
        return Ok(await billingService.GetRevenueSummaryAsync(cancellationToken));
    }
}
