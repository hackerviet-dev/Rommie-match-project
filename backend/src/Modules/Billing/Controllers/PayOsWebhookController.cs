using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RoomieMatch.Modules.Billing.Gateways;
using RoomieMatch.Modules.Billing.Services;

namespace RoomieMatch.Modules.Billing.Controllers;

// payOS reports the payment result here. Anonymous on purpose: payOS cannot log in, so the
// payload's HMAC signature is what proves the caller is genuine.
[ApiController]
[AllowAnonymous]
[ApiExplorerSettings(IgnoreApi = true)]
[Route("api/billing/payos/webhook")]
public sealed class PayOsWebhookController(
    IBillingService billingService,
    IPaymentWebhookGateway webhookGateway,
    IOptions<BillingOptions> options,
    ILogger<PayOsWebhookController> logger) : ControllerBase
{
    // payOS probes the URL with a sample payload carrying this order code; it matches no order
    // and is not worth a warning.
    private const long SampleOrderCode = 123;

    // A genuine webhook is a small JSON document. Anything larger is refused before it is read.
    private const int MaxBodyBytes = 16 * 1024;

    [HttpPost]
    public async Task<IActionResult> Receive(CancellationToken cancellationToken)
    {
        if (options.Value.Provider != PayOsPaymentGateway.ProviderName)
        {
            return NotFound();
        }

        // The body is read by hand: the signature covers the exact JSON payOS sent.
        var rawBody = await ReadBodyAsync(cancellationToken);
        if (rawBody is null)
        {
            return StatusCode(StatusCodes.Status413PayloadTooLarge);
        }

        var result = webhookGateway.ReadWebhook(rawBody);
        if (result is null)
        {
            return BadRequest();
        }

        var confirmation = await billingService.ConfirmWebhookPaymentAsync(
            webhookGateway.Name,
            result.ProviderOrderCode,
            result.Succeeded,
            result.Amount,
            result.ProviderTransactionId,
            cancellationToken);

        LogOutcome(result, confirmation);

        // payOS only needs a 2XX to stop retrying. An order code we do not know — payOS sends a
        // sample when the webhook URL is registered — is not an error.
        return Ok(new { code = "00", desc = "success", paymentId = confirmation.Payment?.Id });
    }

    // Only the order code and the payment's status are logged; never the body, the signature or
    // any key.
    private void LogOutcome(ReadWebhookResult result, WebhookConfirmResult confirmation)
    {
        switch (confirmation.Outcome)
        {
            case PaymentConfirmOutcome.NotFound when result.ProviderOrderCode != SampleOrderCode:
                logger.LogWarning(
                    "payOS webhook: không có đơn nào ứng với order code {OrderCode}.",
                    result.ProviderOrderCode);
                break;
            case PaymentConfirmOutcome.AmountMismatch:
                logger.LogWarning(
                    "payOS webhook: số tiền báo về không khớp đơn (order code {OrderCode}, trạng thái {Status}) nên không kích hoạt Premium.",
                    result.ProviderOrderCode, confirmation.Payment?.Status);
                break;
            case PaymentConfirmOutcome.NotPending:
                logger.LogWarning(
                    "payOS webhook: báo đã trả cho đơn ở trạng thái {Status} (order code {OrderCode}) nên không kích hoạt Premium.",
                    confirmation.Payment?.Status, result.ProviderOrderCode);
                break;
        }
    }

    // Reads the body with a hard cap so an oversized payload cannot be buffered in full.
    private async Task<string?> ReadBodyAsync(CancellationToken cancellationToken)
    {
        if (Request.ContentLength is > MaxBodyBytes)
        {
            return null;
        }

        var buffer = new byte[MaxBodyBytes + 1];
        var total = 0;
        while (total < buffer.Length)
        {
            var read = await Request.Body.ReadAsync(buffer.AsMemory(total), cancellationToken);
            if (read == 0)
            {
                break;
            }

            total += read;
        }

        // One byte past the limit means the body is bigger than we accept.
        return total > MaxBodyBytes ? null : Encoding.UTF8.GetString(buffer, 0, total);
    }
}
