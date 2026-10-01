using System.ComponentModel.DataAnnotations;

namespace RoomieMatch.Modules.Billing.Services;

public interface IBillingService
{
    object GetModuleStatus();

    Task<SubscriptionDto> GetSubscriptionAsync(Guid userId, CancellationToken cancellationToken);

    Task<CheckoutResult> CheckoutAsync(Guid userId, CheckoutRequest request, CancellationToken cancellationToken);

    Task<PaymentDto?> GetPaymentAsync(Guid paymentId, Guid? ownerUserId, CancellationToken cancellationToken);

    Task<IReadOnlyList<PaymentDto>> GetPaymentsAsync(Guid userId, CancellationToken cancellationToken);

    // Idempotent: gateways retry callbacks, so a payment that is no longer pending is
    // returned unchanged instead of being applied twice.
    Task<PaymentDto?> ConfirmPaymentAsync(
        Guid paymentId,
        bool succeeded,
        string? providerTransactionId,
        CancellationToken cancellationToken);

    // Used by a gateway webhook, which knows the provider's own reference instead of our
    // payment id. Delegates to ConfirmPaymentAsync so the same idempotency rules apply, and
    // reports the outcome so the endpoint can log the cases a human has to look at. amount is
    // what the provider says it collected; when given, it must match the order or no Premium is
    // granted.
    Task<WebhookConfirmResult> ConfirmWebhookPaymentAsync(
        string provider,
        long providerOrderCode,
        bool succeeded,
        int? amount,
        string? providerTransactionId,
        CancellationToken cancellationToken);

    // Refunds a paid order of the caller within the refund window and takes the
    // order's months back off the subscription.
    Task<RefundResult> RefundAsync(
        Guid userId,
        Guid paymentId,
        RefundRequest request,
        CancellationToken cancellationToken);
}

public static class PaymentStatus
{
    public const string Pending = "pending";
    public const string Paid = "paid";
    public const string Failed = "failed";
    public const string Expired = "expired";
    public const string Refunded = "refunded";
}

// What a confirm attempt decided. Anything but Applied means Premium was NOT granted and the
// webhook should leave a trace for a human.
public enum PaymentConfirmOutcome
{
    // Settled: Premium granted, the order closed as failed/expired, or an already-settled order
    // confirmed again (gateways retry).
    Applied,
    // The provider reported an amount that does not match the order.
    AmountMismatch,
    // The provider reports a paid order for one already failed/expired/refunded.
    NotPending,
    // No order carries the provider's reference.
    NotFound
}

// The outcome of a webhook confirm, plus the payment it touched (null when none matched).
public sealed record WebhookConfirmResult(PaymentConfirmOutcome Outcome, PaymentDto? Payment);

public enum RefundError
{
    None,
    NotFound,
    NotPaid,
    AlreadyRefunded,
    WindowExpired,
    GatewayNotConfigured,
    // The provider itself refused the refund (payOS only refunds by hand).
    GatewayRejected
}

public sealed record RefundResult(RefundError Error, PaymentDto? Payment)
{
    public static RefundResult Success(PaymentDto payment) => new(RefundError.None, payment);

    public static RefundResult Failure(RefundError error) => new(error, null);
}

public sealed record RefundRequest(
    [StringLength(1000)] string? Reason);

public enum CheckoutError
{
    None,
    UnknownPlan,
    GatewayNotConfigured,
    // The gateway was configured but the provider refused to open the order.
    GatewayFailed
}

public sealed record CheckoutResult(CheckoutError Error, CheckoutResponse? Checkout)
{
    public static CheckoutResult Success(CheckoutResponse checkout) => new(CheckoutError.None, checkout);

    public static CheckoutResult Failure(CheckoutError error) => new(error, null);
}

public sealed record CheckoutRequest(
    [Required, StringLength(40)] string PlanCode);

public sealed record CheckoutResponse(
    Guid PaymentId,
    string PlanCode,
    int Amount,
    string Currency,
    string PaymentUrl,
    DateTimeOffset ExpiresAt);

public sealed record PaymentDto(
    Guid Id,
    string PlanCode,
    int Amount,
    string Currency,
    string Provider,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt,
    DateTimeOffset? PaidAt,
    DateTimeOffset? RefundedAt,
    // Set only while the order is paid and still inside the refund window.
    DateTimeOffset? RefundableUntil);

public sealed record SubscriptionDto(
    string Tier,
    bool IsPremium,
    Guid? SubscriptionId,
    DateTimeOffset? StartsAt,
    DateTimeOffset? EndsAt);
