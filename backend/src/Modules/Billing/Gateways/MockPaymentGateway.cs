using Microsoft.Extensions.Options;

namespace RoomieMatch.Modules.Billing.Gateways;

public sealed class MockPaymentGateway(IOptions<BillingOptions> options) : IPaymentGateway
{
    public const string ProviderName = "mock";

    public string Name => ProviderName;

    public string CreatePaymentUrl(Guid paymentId, PlanDto plan)
    {
        return $"{options.Value.PublicApiBaseUrl.TrimEnd('/')}/api/billing/mock-gateway/{paymentId}";
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
