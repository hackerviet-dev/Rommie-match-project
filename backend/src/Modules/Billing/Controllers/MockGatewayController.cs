using System.Globalization;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using RoomieMatch.Modules.Billing.Gateways;
using RoomieMatch.Modules.Billing.Services;

namespace RoomieMatch.Modules.Billing.Controllers;

// Stands in for a provider's hosted payment page. Reachable only when Billing:Provider is
// "mock", because anyone who can open it can mark a payment as paid without paying.
[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
[Route("api/billing/mock-gateway/{paymentId:guid}")]
public sealed class MockGatewayController(
    IBillingService billingService,
    IOptions<BillingOptions> options) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Page(Guid paymentId, CancellationToken cancellationToken)
    {
        if (!IsEnabled)
        {
            return NotFound();
        }

        var payment = await billingService.GetPaymentAsync(paymentId, null, cancellationToken);
        if (payment is null)
        {
            return NotFound();
        }

        var planName = Plans.All.FirstOrDefault(p => p.Code == payment.PlanCode)?.Name ?? payment.PlanCode;
        var body = payment.Status == PaymentStatus.Pending
            ? $"""
               <form method="post" action="/api/billing/mock-gateway/{payment.Id}/complete">
                 <button name="result" value="success" class="pay">Thanh toán thành công</button>
                 <button name="result" value="failed" class="fail">Huỷ / thanh toán thất bại</button>
               </form>
               """
            : $"""<p>Đơn này đã được xử lý (trạng thái: <b>{payment.Status}</b>).</p>""";

        var html = $$"""
            <!doctype html>
            <html lang="vi">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Cổng thanh toán giả lập</title>
              <style>
                body { font-family: system-ui, sans-serif; background: #f4f6f8; margin: 0; padding: 16px; }
                .card { max-width: 420px; margin: 48px auto; background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 4px 20px rgba(0,0,0,.08); }
                .tag { display: inline-block; background: #fff3cd; color: #856404; border-radius: 999px; padding: 2px 10px; font-size: 12px; }
                .amount { font-size: 32px; font-weight: 800; margin: 12px 0 4px; }
                button { display: block; width: 100%; margin-top: 12px; padding: 14px; border: 0; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; }
                .pay { background: #0f766e; color: #fff; }
                .fail { background: #e5e7eb; color: #111827; }
                .muted { color: #6b7280; font-size: 13px; }
              </style>
            </head>
            <body>
              <div class="card">
                <span class="tag">MÔI TRƯỜNG TEST — không trừ tiền thật</span>
                <h2>RoomieMatch · {{HtmlEncoder.Default.Encode(planName)}}</h2>
                <div class="amount">{{FormatVnd(payment.Amount)}}₫</div>
                <p class="muted">Mã đơn: {{payment.Id}}</p>
                {{body}}
              </div>
            </body>
            </html>
            """;

        return Content(html, "text/html; charset=utf-8");
    }

    [HttpPost("complete")]
    public async Task<IActionResult> Complete(
        Guid paymentId,
        [FromForm] string result,
        CancellationToken cancellationToken)
    {
        if (!IsEnabled)
        {
            return NotFound();
        }

        var payment = await billingService.ConfirmPaymentAsync(
            paymentId,
            succeeded: result == "success",
            providerTransactionId: $"MOCK-{Guid.NewGuid():N}",
            cancellationToken);

        if (payment is null)
        {
            return NotFound();
        }

        var returnUrl = options.Value.ReturnUrl;
        var separator = returnUrl.Contains('?') ? '&' : '?';
        return Redirect($"{returnUrl}{separator}paymentId={payment.Id}&status={payment.Status}");
    }

    private bool IsEnabled => options.Value.Provider == MockPaymentGateway.ProviderName;

    // The Alpine runtime image runs in globalization-invariant mode, so "vi-VN" is not
    // available; build the dot-grouped VND format by hand.
    private static string FormatVnd(int amount)
    {
        return amount.ToString("N0", CultureInfo.InvariantCulture).Replace(',', '.');
    }
}
