using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using RoomieMatch.Modules.Billing.Services;
using RoomieMatch.Shared.Authentication;

namespace RoomieMatch.Modules.Billing.Controllers;

[ApiController]
[Route("api/billing")]
public sealed class BillingController(IBillingService billingService) : ControllerBase
{
    [EndpointSummary("Thông tin module Billing")]
    [EndpointDescription("API công khai, không có parameter hoặc body. Trả thông tin cấu hình cố định của module; không kiểm tra database. Kiểm tra kết nối database bằng GET /health.")]
    [ProducesResponseType(200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(billingService.GetModuleStatus());
    }

    [EndpointSummary("Lấy bảng giá gói thành viên")]
    [EndpointDescription("API công khai. 200 trả mảng PlanDto. Hiển thị giá từ server; gửi code của gói sang checkout, không gửi số tiền.")]
    [ProducesResponseType(typeof(IReadOnlyList<PlanDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("plans")]
    public ActionResult<IReadOnlyList<PlanDto>> GetPlans()
    {
        return Ok(Plans.All);
    }

    [Authorize]
    [EndpointSummary("Lấy quyền Premium hiện tại")]
    [EndpointDescription("Cần đăng nhập. 200 trả SubscriptionDto; dùng isPremium và endsAt để hiển thị quyền lợi.")]
    [ProducesResponseType(typeof(SubscriptionDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me/subscription")]
    public async Task<ActionResult<SubscriptionDto>> GetMySubscription(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await billingService.GetSubscriptionAsync(userId, cancellationToken));
    }

    [Authorize]
    [EndpointSummary("Tạo liên kết thanh toán Premium")]
    [EndpointDescription("Cần đăng nhập. Gửi planCode từ GET /api/billing/plans. 200 trả CheckoutResponse; chuyển trình duyệt tới paymentUrl. Server quyết định số tiền. 400: gói sai; 502: cổng từ chối; 503: chưa cấu hình. Khi quay về trang kết quả, gọi GET /api/billing/payments/{paymentId}; không tin status trên URL.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(502, Description = "Cổng thanh toán từ chối hoặc gặp lỗi; xem mô tả endpoint.")]
    [ProducesResponseType(503, Description = "Dịch vụ phụ thuộc/cổng thanh toán chưa khả dụng.")]
    [ProducesResponseType(typeof(CheckoutResponse), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("checkout")]
    public async Task<ActionResult<CheckoutResponse>> Checkout(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] CheckoutRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var result = await billingService.CheckoutAsync(userId, request, cancellationToken);
        return result.Error switch
        {
            CheckoutError.None => Ok(result.Checkout),
            CheckoutError.UnknownPlan => Problem(
                "Gói không tồn tại hoặc không thể mua.",
                statusCode: StatusCodes.Status400BadRequest),
            CheckoutError.GatewayFailed => Problem(
                "Chưa tạo được liên kết thanh toán. Vui lòng thử lại sau.",
                statusCode: StatusCodes.Status502BadGateway),
            _ => Problem(
                "Hệ thống thanh toán chưa được cấu hình.",
                statusCode: StatusCodes.Status503ServiceUnavailable)
        };
    }

    [Authorize]
    [EndpointSummary("Lịch sử thanh toán của tôi")]
    [EndpointDescription("Cần đăng nhập. 200 trả mảng PaymentDto gồm tối đa 50 đơn gần nhất của tài khoản.")]
    [ProducesResponseType(typeof(IReadOnlyList<PaymentDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("payments")]
    public async Task<ActionResult<IReadOnlyList<PaymentDto>>> GetMyPayments(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await billingService.GetPaymentsAsync(userId, cancellationToken));
    }

    [Authorize]
    [EndpointSummary("Kiểm tra trạng thái thanh toán")]
    [EndpointDescription("Cần đăng nhập. Gọi ở trang kết quả thanh toán. 200 trả PaymentDto với status pending/paid/failed/expired/refunded. Khi paid, gọi GET /api/billing/me/subscription để cập nhật Premium. 404: đơn không có/thuộc người khác.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(PaymentDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("payments/{paymentId:guid}")]
    public async Task<ActionResult<PaymentDto>> GetPayment([Description("UUID đơn thanh toán, lấy từ paymentId của checkout hoặc id trong lịch sử.")] Guid paymentId, CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var payment = await billingService.GetPaymentAsync(paymentId, userId, cancellationToken);
        return payment is null ? NotFound() : Ok(payment);
    }

    // The body is optional; a refund without a reason is still a refund.
    [Authorize]
    [EndpointSummary("Yêu cầu hoàn tiền một đơn")]
    [EndpointDescription("Cần đăng nhập. Body tùy chọn {reason}. Chỉ hoàn đơn paid trong 7 ngày từ paidAt. 200 trả PaymentDto và trừ thời hạn Premium tương ứng. 404: đơn không có/thuộc người khác; 409: already_refunded/payment_not_refundable/refund_window_expired; 502 refund_rejected (payOS cần hoàn thủ công); 503 gateway_unavailable.")]
    [ProducesResponseType(400, Description = "Body JSON không hợp lệ hoặc reason dài quá 1000 ký tự.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(409, Description = "Xung đột trạng thái; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(502, Description = "Cổng thanh toán từ chối hoặc gặp lỗi; xem mô tả endpoint.")]
    [ProducesResponseType(503, Description = "Dịch vụ phụ thuộc/cổng thanh toán chưa khả dụng.")]
    [ProducesResponseType(typeof(PaymentDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("payments/{paymentId:guid}/refund")]
    public async Task<ActionResult<PaymentDto>> Refund(
        [Description("UUID đơn thanh toán, lấy từ paymentId của checkout hoặc id trong lịch sử.")] Guid paymentId,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] RefundRequest? request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var result = await billingService.RefundAsync(
            userId, paymentId, request ?? new RefundRequest(null), cancellationToken);

        return result.Error switch
        {
            RefundError.None => Ok(result.Payment),
            RefundError.NotFound => NotFound(),
            RefundError.AlreadyRefunded => CodedProblem(
                StatusCodes.Status409Conflict, "already_refunded", "Đơn này đã được hoàn tiền."),
            RefundError.NotPaid => CodedProblem(
                StatusCodes.Status409Conflict, "payment_not_refundable", "Chỉ hoàn tiền được đơn đã thanh toán."),
            RefundError.WindowExpired => CodedProblem(
                StatusCodes.Status409Conflict, "refund_window_expired", "Đã quá thời hạn hoàn tiền của đơn này."),
            RefundError.GatewayRejected => CodedProblem(
                StatusCodes.Status502BadGateway, "refund_rejected",
                "Cổng thanh toán không hỗ trợ hoàn tiền tự động cho đơn này. Vui lòng liên hệ hỗ trợ."),
            _ => CodedProblem(
                StatusCodes.Status503ServiceUnavailable, "gateway_unavailable",
                "Cổng thanh toán của đơn này hiện không khả dụng.")
        };
    }

    private ObjectResult CodedProblem(int status, string code, string detail)
    {
        var problem = ProblemDetailsFactory.CreateProblemDetails(HttpContext, status, detail: detail);
        problem.Extensions["code"] = code;
        return new ObjectResult(problem)
        {
            StatusCode = status,
            ContentTypes = { "application/problem+json" }
        };
    }
}
