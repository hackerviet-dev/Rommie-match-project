using Microsoft.Extensions.Options;

namespace RoomieMatch.Modules.Billing.Gateways;

public sealed class MockPaymentGateway(IOptions<BillingOptions> options) : IPaymentGateway
{
    public const string ProviderName = "mock";

    public string Name => ProviderName;

    // The mock page is addressed by our own payment id, so there is no code to mint.
    public bool UsesProviderOrderCode => false;

    public Task<GatewayCheckout> CreateCheckoutAsync(
        Guid paymentId,
        PlanDto plan,
        long? providerOrderCode,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken)
    {
        var paymentUrl = $"{options.Value.PublicApiBaseUrl.TrimEnd('/')}/api/billing/mock-gateway/{paymentId}";
        return Task.FromResult(new GatewayCheckout(paymentUrl));
    }

    public Task<string> RefundAsync(
        Guid paymentId,
        string? providerTransactionId,
        int amount,
        CancellationToken cancellationToken)
    {
        return Task.FromResult($"MOCK-REFUND-{Guid.NewGuid():N}");
    }
}
