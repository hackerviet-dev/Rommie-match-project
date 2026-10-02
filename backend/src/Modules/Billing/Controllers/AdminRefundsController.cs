using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Billing.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Billing.Controllers;

// Manual refunds: payOS cannot send money back through its API, so a buyer's refund becomes a
// request that an admin carries out by bank transfer and then records here. Admin only, because
// approving takes Premium away and states that money left the business.
[ApiController]
[Authorize(Roles = "admin")]
[Route("api/admin/billing/refund-requests")]
public sealed class AdminRefundsController(IBillingService billingService) : ControllerBase
{
    [EndpointSummary("Danh sách yêu cầu hoàn tiền thủ công")]
    [EndpointDescription("Chỉ role admin. 200 trả PagedResult<AdminRefundRequestDto>, mới nhất trước, kèm thông tin đơn (orderCode, mã giao dịch payOS, số tiền) để đối soát. status tùy chọn pending/approved/rejected; 400 nếu sai giá trị.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(typeof(PagedResult<AdminRefundRequestDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet]
    public async Task<ActionResult<PagedResult<AdminRefundRequestDto>>> List(
        [FromQuery] PageQuery paging,
        [FromQuery] [Description("Lọc trạng thái: pending, approved, rejected; bỏ trống để lấy tất cả.")] string? status,
        CancellationToken cancellationToken)
    {
        if (status is not null
            && status is not (RefundRequestStatus.Pending or RefundRequestStatus.Approved or RefundRequestStatus.Rejected))
        {
            return Problem("Trạng thái yêu cầu hoàn tiền không hợp lệ.", statusCode: StatusCodes.Status400BadRequest);
        }

        return Ok(await billingService.GetRefundRequestsAsync(status, paging, cancellationToken));
    }

    [EndpointSummary("Xác nhận đã hoàn tiền")]
    [EndpointDescription("Chỉ role admin. Gọi sau khi đã chuyển khoản hoàn tiền cho người mua. Body {transferReference, note?}. 200 trả AdminRefundRequestDto status=approved; đơn chuyển sang refunded và thời hạn Premium bị trừ tương ứng. 400: thiếu transferReference; 404: không có yêu cầu pending với id này; 409 payment_not_paid: đơn không còn ở trạng thái paid.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(409, Description = "Xung đột trạng thái; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(typeof(AdminRefundRequestDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("{requestId:guid}/approve")]
    public async Task<ActionResult<AdminRefundRequestDto>> Approve(
        [Description("UUID yêu cầu hoàn tiền, lấy từ id trong danh sách.")] Guid requestId,
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] ApproveRefundRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.TransferReference))
        {
            return Problem("Cần mã giao dịch chuyển khoản hoàn tiền.", statusCode: StatusCodes.Status400BadRequest);
        }

        if (User.GetUserId() is not { } adminId)
        {
            return Unauthorized();
        }

        return ToResult(await billingService.ApproveRefundRequestAsync(requestId, adminId, request, cancellationToken));
    }

    [EndpointSummary("Từ chối yêu cầu hoàn tiền")]
    [EndpointDescription("Chỉ role admin. Body {note} bắt buộc, là lý do gửi cho người mua. 200 trả AdminRefundRequestDto status=rejected; đơn vẫn paid và Premium giữ nguyên. Người mua có thể gửi lại nếu còn trong hạn hoàn tiền. 400: thiếu note; 404: không có yêu cầu pending với id này.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(AdminRefundRequestDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("{requestId:guid}/reject")]
    public async Task<ActionResult<AdminRefundRequestDto>> Reject(
        [Description("UUID yêu cầu hoàn tiền, lấy từ id trong danh sách.")] Guid requestId,
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] RejectRefundRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Note))
        {
            return Problem("Cần lý do từ chối.", statusCode: StatusCodes.Status400BadRequest);
        }

        if (User.GetUserId() is not { } adminId)
        {
            return Unauthorized();
        }

        return ToResult(await billingService.RejectRefundRequestAsync(requestId, adminId, request, cancellationToken));
    }

    private ActionResult<AdminRefundRequestDto> ToResult(ResolveRefundResult result)
    {
        switch (result.Error)
        {
            case ResolveRefundError.None:
                return Ok(result.Request);
            case ResolveRefundError.NotFound:
                return NotFound();
            default:
                var problem = ProblemDetailsFactory.CreateProblemDetails(
                    HttpContext,
                    StatusCodes.Status409Conflict,
                    detail: "Đơn thanh toán không còn ở trạng thái đã thanh toán.");
                problem.Extensions["code"] = "payment_not_paid";
                return new ObjectResult(problem)
                {
                    StatusCode = StatusCodes.Status409Conflict,
                    ContentTypes = { "application/problem+json" }
                };
        }
    }
}
