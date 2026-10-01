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
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(billingService.GetModuleStatus());
    }

    [HttpGet("plans")]
    public ActionResult<IReadOnlyList<PlanDto>> GetPlans()
    {
        return Ok(Plans.All);
    }

    [Authorize]
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
    [HttpPost("checkout")]
    public async Task<ActionResult<CheckoutResponse>> Checkout(
        CheckoutRequest request,
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
    [HttpGet("payments/{paymentId:guid}")]
    public async Task<ActionResult<PaymentDto>> GetPayment(Guid paymentId, CancellationToken cancellationToken)
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
    [HttpPost("payments/{paymentId:guid}/refund")]
    public async Task<ActionResult<PaymentDto>> Refund(
        Guid paymentId,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] RefundRequest? request,
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
