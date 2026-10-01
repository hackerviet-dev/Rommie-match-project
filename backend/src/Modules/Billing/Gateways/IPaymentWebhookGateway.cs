namespace RoomieMatch.Modules.Billing.Gateways;

// Implemented by providers that report the payment result by calling a webhook of ours, so the
// webhook endpoint can check the provider's signature before it touches any payment row.
public interface IPaymentWebhookGateway
{
    string Name { get; }

    // Returns what the provider reported, or null when the payload is not authentic.
    ReadWebhookResult? ReadWebhook(string rawBody);
}

// ProviderOrderCode is the reference handed to the provider at checkout and echoed back here;
// it is what identifies our payment row. Amount is what the provider says it collected, so the
// webhook can refuse to grant Premium for an amount that does not match the order.
public sealed record ReadWebhookResult(
    long ProviderOrderCode,
    bool Succeeded,
    int? Amount,
    string? ProviderTransactionId);
