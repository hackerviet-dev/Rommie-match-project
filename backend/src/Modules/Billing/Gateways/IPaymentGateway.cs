namespace RoomieMatch.Modules.Billing.Gateways;

// A real provider (payOS, VNPay, MoMo...) gets its own implementation plus its own callback
// endpoint that verifies the provider's signature and then calls
// IBillingService.ConfirmPaymentAsync — the same entry point the mock gateway uses.
public interface IPaymentGateway
{
    string Name { get; }

    // True when the provider's callback identifies the order by a code of its own, which billing
    // mints from a database sequence before the order is opened and stores on the payment row.
    // False when the provider is addressed by our own payment id and needs no code.
    bool UsesProviderOrderCode { get; }

    // Opens the order on the provider side and returns where to send the buyer's browser.
    // providerOrderCode is the code billing minted (null for gateways that do not use one) and is
    // already on the payment row. expiresAt is passed on so the provider closes the order at the
    // same moment we do.
    Task<GatewayCheckout> CreateCheckoutAsync(
        Guid paymentId,
        PlanDto plan,
        long? providerOrderCode,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken);

    // False when the provider cannot send money back through its API (payOS): a refund of such an
    // order is filed as a request that an admin carries out by bank transfer, and RefundAsync is
    // never called for it.
    bool SupportsAutomaticRefund { get; }

    // Returns the provider's refund id. Throws when the provider refuses the refund.
    Task<string> RefundAsync(
        Guid paymentId,
        string? providerTransactionId,
        int amount,
        CancellationToken cancellationToken);
}

// The provider's hosted payment page, which is where the buyer's browser is sent next.
public sealed record GatewayCheckout(string PaymentUrl);
