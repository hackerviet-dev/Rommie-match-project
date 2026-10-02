using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using RoomieMatch.Shared.Paging;

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
    // order's months back off the subscription. When the order's provider cannot refund
    // through its API (payOS), files a refund request for an admin instead and changes nothing
    // else; the result then has Requested set.
    Task<RefundResult> RefundAsync(
        Guid userId,
        Guid paymentId,
        RefundRequest request,
        CancellationToken cancellationToken);

    // The admin queue of manual refunds, newest first. status null means every request.
    Task<PagedResult<AdminRefundRequestDto>> GetRefundRequestsAsync(
        string? status,
        PageQuery paging,
        CancellationToken cancellationToken);

    // Approving records the bank transfer that sent the money back, marks the payment refunded
    // and takes its months off the subscription, all in one transaction. Rejecting only closes
    // the request.
    Task<ResolveRefundResult> ApproveRefundRequestAsync(
        Guid requestId,
        Guid adminId,
        ApproveRefundRequest request,
        CancellationToken cancellationToken);

    Task<ResolveRefundResult> RejectRefundRequestAsync(
        Guid requestId,
        Guid adminId,
        RejectRefundRequest request,
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

public static class RefundRequestStatus
{
    public const string Pending = "pending";
    public const string Approved = "approved";
    public const string Rejected = "rejected";
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
    // The provider itself refused the refund.
    GatewayRejected,
    // A manual refund request for this order is already waiting for an admin.
    RefundPending
}

// Requested: no money moved yet; a manual refund request now waits for an admin.
public sealed record RefundResult(RefundError Error, PaymentDto? Payment, bool Requested = false)
{
    public static RefundResult Success(PaymentDto payment) => new(RefundError.None, payment);

    public static RefundResult Filed(PaymentDto payment) => new(RefundError.None, payment, true);

    public static RefundResult Failure(RefundError error) => new(error, null);
}

public enum ResolveRefundError
{
    None,
    // No pending request carries this id.
    NotFound,
    // The order is no longer paid (refunded some other way), so it cannot be approved.
    PaymentNotPaid
}

public sealed record ResolveRefundResult(ResolveRefundError Error, AdminRefundRequestDto? Request)
{
    public static ResolveRefundResult Success(AdminRefundRequestDto request) => new(ResolveRefundError.None, request);

    public static ResolveRefundResult Failure(ResolveRefundError error) => new(error, null);
}

public sealed record ApproveRefundRequest(
    [Required, StringLength(200, MinimumLength = 1)] [property: Description("Mã giao dịch chuyển khoản đã hoàn tiền cho người mua, tối đa 200 ký tự.")] string TransferReference,
    [StringLength(2000)] [property: Description("Ghi chú nội bộ tùy chọn, tối đa 2000 ký tự.")] string? Note);

public sealed record RejectRefundRequest(
    [Required, StringLength(2000, MinimumLength = 1)] [property: Description("Lý do từ chối gửi cho người mua, bắt buộc, tối đa 2000 ký tự.")] string Note);

// The latest manual refund request of an order, as its buyer sees it.
public sealed record RefundRequestDto(
    Guid Id,
    [property: Description("pending, approved hoặc rejected.")] string Status,
    string? Reason,
    [property: Description("Ghi chú của admin khi duyệt hoặc lý do từ chối.")] string? ResolutionNote,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ResolvedAt);

public sealed record AdminRefundRequestDto(
    Guid Id,
    Guid PaymentId,
    Guid UserId,
    string UserEmail,
    string UserName,
    string PlanCode,
    int Amount,
    string Currency,
    string Provider,
    long? ProviderOrderCode,
    string? ProviderTransactionId,
    DateTimeOffset? PaidAt,
    string PaymentStatus,
    string? Reason,
    string Status,
    string? TransferReference,
    string? ResolutionNote,
    Guid? ResolvedBy,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ResolvedAt);

public sealed record RefundRequest(
    [StringLength(1000)] [property: Description("Lý do hoàn tiền tùy chọn, tối đa 1000 ký tự.")] string? Reason);

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
    [Required, StringLength(40)] [property: Description("Mã gói có thể mua từ GET /api/billing/plans, ví dụ premium_monthly hoặc premium_yearly.")] string PlanCode);

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
    // Set only while the order is paid, still inside the refund window and has no refund
    // request waiting for an admin.
    DateTimeOffset? RefundableUntil,
    // The latest manual refund request (payOS orders); null when none was filed.
    RefundRequestDto? RefundRequest);

public sealed record SubscriptionDto(
    string Tier,
    bool IsPremium,
    Guid? SubscriptionId,
    DateTimeOffset? StartsAt,
    DateTimeOffset? EndsAt);
