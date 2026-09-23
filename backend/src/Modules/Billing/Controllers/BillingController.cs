using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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
}
