using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace RoomieMatch.Modules.Billing.Gateways;

// payOS (payos.vn) checkout: the buyer is sent to a payOS-hosted page and pays by Napas 247
// bank transfer or VietQR. payOS then posts the result to our webhook, signed with the
// channel's checksum key, which is why every payOS payment keeps an order code of its own.
public sealed class PayOsPaymentGateway(
    IHttpClientFactory httpClientFactory,
    IOptions<BillingOptions> options) : IPaymentGateway, IPaymentWebhookGateway
{
    public const string ProviderName = "payos";
    public const string HttpClientName = "payos";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public string Name => ProviderName;

    public async Task<GatewayCheckout> CreateCheckoutAsync(
        Guid paymentId,
        PlanDto plan,
        long? providerOrderCode,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken)
    {
        var payOs = options.Value.PayOs;
        if (!IsConfigured(payOs))
        {
            throw new InvalidOperationException(
                "payOS chưa được cấu hình: thiếu ClientId, ApiKey hoặc ChecksumKey.");
        }

        // Billing minted the order code first (see BillingService.NextProviderOrderCodeAsync) and
        // already stored it on the payment row — it is the only handle the webhook sends back.
        var orderCode = providerOrderCode
            ?? throw new InvalidOperationException("Thiếu mã đơn payOS khi tạo link thanh toán.");
        // Bank-transfer remarks are capped at 9 characters on a channel without a linked account.
        var description = plan.Code.Length <= 9 ? plan.Code : plan.Code[..9];
        // payOS does not echo our id back, so it is appended to both redirect URLs — before the
        // signature is taken, since the signature covers them — for the result page to look the
        // order up directly.
        var returnUrl = WithPaymentId(options.Value.ReturnUrl, paymentId);
        var cancelUrl = returnUrl;
        var amount = plan.Price;

        var signature = PayOsSignature.ForPaymentRequest(
            orderCode, amount, description, cancelUrl, returnUrl, payOs.ChecksumKey);

        var body = new CreatePaymentLinkRequest(
            OrderCode: orderCode,
            Amount: amount,
            Description: description,
            CancelUrl: cancelUrl,
            ReturnUrl: returnUrl,
            // Our own expiry is handed over so payOS stops taking money when we stop accepting it.
            ExpiredAt: (int)expiresAt.ToUnixTimeSeconds(),
            Signature: signature);

        var client = httpClientFactory.CreateClient(HttpClientName);
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{payOs.ApiBaseUrl.TrimEnd('/')}/v2/payment-requests")
        {
            Content = JsonContent.Create(body, options: JsonOptions)
        };
        // payOS authenticates with the channel's id/key pair instead of a bearer token.
        request.Headers.Add("x-client-id", payOs.ClientId);
        request.Headers.Add("x-api-key", payOs.ApiKey);

        using var response = await client.SendAsync(request, cancellationToken);
        var payload = await ReadAsync<CreatePaymentLinkData>(response, cancellationToken);
        if (payload?.Code != "00" || payload.Data?.CheckoutUrl is not { Length: > 0 } checkoutUrl)
        {
            throw new InvalidOperationException(
                $"payOS từ chối tạo link thanh toán: {payload?.Desc ?? response.StatusCode.ToString()}");
        }

        return new GatewayCheckout(checkoutUrl);
    }

    // payOS has no refund API for a link that has already been paid — only "cancel", which
    // works while the link is still unpaid — so the money has to go back by hand.
    public Task<string> RefundAsync(
        Guid paymentId,
        string? providerTransactionId,
        int amount,
        CancellationToken cancellationToken)
    {
        throw new InvalidOperationException(
            "payOS không hỗ trợ hoàn tiền tự động cho đơn đã thanh toán; phải hoàn tiền thủ công.");
    }

    public ReadWebhookResult? ReadWebhook(string rawBody)
    {
        var checksumKey = options.Value.PayOs.ChecksumKey;
        if (string.IsNullOrWhiteSpace(checksumKey))
        {
            return null;
        }

        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(rawBody);
        }
        catch (JsonException)
        {
            return null;
        }

        using (document)
        {
            var root = document.RootElement;
            if (!root.TryGetProperty("data", out var data)
                || data.ValueKind != JsonValueKind.Object
                || !root.TryGetProperty("signature", out var signature)
                || signature.ValueKind != JsonValueKind.String)
            {
                return null;
            }

            // The signature covers the data object, so it is what proves the payload really came
            // from payOS and was signed with our checksum key.
            if (!PayOsSignature.Matches(PayOsSignature.ForData(data, checksumKey), signature.GetString()!))
            {
                return null;
            }

            if (!data.TryGetProperty("orderCode", out var orderCode) || !orderCode.TryGetInt64(out var code))
            {
                return null;
            }

            // "success" together with data.code "00" is how payOS reports a completed transfer.
            var succeeded = root.TryGetProperty("success", out var success)
                && success.ValueKind == JsonValueKind.True
                && (!data.TryGetProperty("code", out var dataCode)
                    || dataCode.ValueKind != JsonValueKind.String
                    || dataCode.GetString() == "00");

            var reference = data.TryGetProperty("reference", out var referenceElement)
                && referenceElement.ValueKind == JsonValueKind.String
                    ? referenceElement.GetString()
                    : null;

            // The amount the buyer actually transferred, so billing can match it to the order.
            var amount = data.TryGetProperty("amount", out var amountElement)
                && amountElement.TryGetInt32(out var parsedAmount)
                    ? parsedAmount
                    : (int?)null;

            return new ReadWebhookResult(code, succeeded, amount, reference);
        }
    }

    private static bool IsConfigured(PayOsOptions payOs)
    {
        return !string.IsNullOrWhiteSpace(payOs.ClientId)
            && !string.IsNullOrWhiteSpace(payOs.ApiKey)
            && !string.IsNullOrWhiteSpace(payOs.ChecksumKey);
    }

    // payOS identifies every order by a code of its own; billing mints it from a database sequence
    // (see BillingService.NextProviderOrderCodeAsync) and stores it before the order is opened.
    public bool UsesProviderOrderCode => true;

    // Appends the payment id to a configured URL, keeping any query string it already carries.
    private static string WithPaymentId(string url, Guid paymentId)
    {
        var separator = url.Contains('?') ? '&' : '?';
        return $"{url}{separator}paymentId={paymentId}";
    }

    private static async Task<PayOsResponse<T>?> ReadAsync<T>(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        try
        {
            return await response.Content.ReadFromJsonAsync<PayOsResponse<T>>(JsonOptions, cancellationToken);
        }
        catch (Exception exception) when (exception is JsonException or NotSupportedException)
        {
            // payOS answers with HTML when something upstream fails; treat that as "no payload".
            return null;
        }
    }

    private sealed record CreatePaymentLinkRequest(
        long OrderCode,
        int Amount,
        string Description,
        string CancelUrl,
        string ReturnUrl,
        int ExpiredAt,
        string Signature);

    private sealed record CreatePaymentLinkData(string? CheckoutUrl, string? QrCode);

    private sealed record PayOsResponse<T>(string? Code, string? Desc, T? Data);
}
