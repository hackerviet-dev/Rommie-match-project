namespace RoomieMatch.Modules.Billing.Gateways;

// A real provider (VNPay, MoMo...) gets its own implementation plus its own callback
// endpoint that verifies the provider's signature and then calls
// IBillingService.ConfirmPaymentAsync — the same entry point the mock gateway uses.
public interface IPaymentGateway
{
    string Name { get; }

    string CreatePaymentUrl(Guid paymentId, PlanDto plan);

    // Returns the provider's refund id. Throws when the provider refuses the refund.
    Task<string> RefundAsync(
        Guid paymentId,
        string? providerTransactionId,
        int amount,
        CancellationToken cancellationToken);
}
