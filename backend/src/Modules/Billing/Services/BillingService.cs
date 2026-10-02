using System.Data.Common;
using Microsoft.Extensions.Options;
using RoomieMatch.Modules.Billing.Gateways;
using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Billing.Services;

public sealed class BillingService(
    IDbConnectionFactory connectionFactory,
    IEnumerable<IPaymentGateway> gateways,
    IOptions<BillingOptions> options) : IBillingService
{
    // A payment together with its latest manual refund request, if any.
    private const string PaymentSelect = """
        SELECT p.id, p.plan_code, p.amount, p.currency, p.provider, p.status, p.created_at,
               p.expires_at, p.paid_at, p.refunded_at,
               r.id, r.status, r.reason, r.resolution_note, r.created_at, r.resolved_at
        FROM payments p
        LEFT JOIN LATERAL (
            SELECT id, status, reason, resolution_note, created_at, resolved_at
            FROM payment_refund_requests
            WHERE payment_id = p.id
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        ) r ON true
        """;

    private const string AdminRefundSelect = """
        SELECT r.id, r.payment_id, r.user_id, u.email, COALESCE(pr.display_name, ''),
               p.plan_code, p.amount, p.currency, p.provider, p.provider_order_code,
               p.provider_transaction_id, p.paid_at, p.status, r.reason, r.status,
               r.transfer_reference, r.resolution_note, r.resolved_by, r.created_at, r.resolved_at
        """;

    private const string AdminRefundFrom = """
        FROM payment_refund_requests r
        JOIN payments p ON p.id = r.payment_id
        JOIN users u ON u.id = r.user_id
        LEFT JOIN profiles pr ON pr.user_id = r.user_id
        """;

    internal const string ActiveSubscriptionSql = """
        SELECT id, starts_at, ends_at
        FROM subscriptions
        WHERE user_id = @user_id AND plan = 'premium' AND status = 'active' AND ends_at > now()
        ORDER BY ends_at DESC
        LIMIT 1
        """;

    public object GetModuleStatus()
    {
        return new
        {
            module = "Billing",
            provider = string.IsNullOrEmpty(options.Value.Provider) ? "none" : options.Value.Provider,
            features = new[] { "plans", "checkout", "subscriptions", "payment-history", "refunds", "manual-refunds" }
        };
    }

    public async Task<SubscriptionDto> GetSubscriptionAsync(Guid userId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = ActiveSubscriptionSql;
        command.AddParameter("user_id", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return new SubscriptionDto("free", false, null, null, null);
        }

        return new SubscriptionDto(
            "premium",
            true,
            reader.GetGuid(0),
            reader.GetFieldValue<DateTimeOffset>(1),
            reader.GetFieldValue<DateTimeOffset>(2));
    }

    public async Task<CheckoutResult> CheckoutAsync(
        Guid userId,
        CheckoutRequest request,
        CancellationToken cancellationToken)
    {
        if (Plans.FindPurchasable(request.PlanCode) is not { } plan)
        {
            return CheckoutResult.Failure(CheckoutError.UnknownPlan);
        }

        var gateway = gateways.FirstOrDefault(g => g.Name == options.Value.Provider);
        if (gateway is null)
        {
            return CheckoutResult.Failure(CheckoutError.GatewayNotConfigured);
        }

        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(options.Value.PaymentTimeoutMinutes);

        // A gateway that identifies orders by its own code gets one from a database sequence, so
        // two app instances never mint the same value. It is written by the INSERT, before the
        // order is opened, so the provider's callback can find the row even if we crash right after
        // telling the provider the code.
        var providerOrderCode = gateway.UsesProviderOrderCode
            ? await NextProviderOrderCodeAsync(cancellationToken)
            : (long?)null;

        const string sql = """
            INSERT INTO payments (user_id, plan_code, amount, currency, provider, provider_order_code, expires_at)
            VALUES (@user_id, @plan_code, @amount, @currency, @provider, @provider_order_code, @expires_at)
            RETURNING id
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("user_id", userId);
        command.AddParameter("plan_code", plan.Code);
        command.AddParameter("amount", plan.Price);
        command.AddParameter("currency", plan.Currency);
        command.AddParameter("provider", gateway.Name);
        command.AddParameter("provider_order_code", providerOrderCode);
        command.AddParameter("expires_at", expiresAt);

        var paymentId = (Guid)(await command.ExecuteScalarAsync(cancellationToken))!;

        try
        {
            var checkout = await gateway.CreateCheckoutAsync(
                paymentId, plan, providerOrderCode, expiresAt, cancellationToken);

            return CheckoutResult.Success(new CheckoutResponse(
                paymentId,
                plan.Code,
                plan.Price,
                plan.Currency,
                checkout.PaymentUrl,
                expiresAt));
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // Missing credentials, a provider outage...: the order never reached the buyer, so
            // it is closed as failed instead of staying pending until it times out.
            await SetStatusAsync(paymentId, PaymentStatus.Failed, cancellationToken);
            return CheckoutResult.Failure(CheckoutError.GatewayFailed);
        }
    }

    public async Task<PaymentDto?> GetPaymentAsync(
        Guid paymentId,
        Guid? ownerUserId,
        CancellationToken cancellationToken)
    {
        var sql = $"{PaymentSelect} WHERE p.id = @id"
            + (ownerUserId is null ? string.Empty : " AND p.user_id = @user_id");

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("id", paymentId);
        if (ownerUserId is not null)
        {
            command.AddParameter("user_id", ownerUserId);
        }

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadPayment(reader) : null;
    }

    public async Task<IReadOnlyList<PaymentDto>> GetPaymentsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var sql = $"{PaymentSelect} WHERE p.user_id = @user_id ORDER BY p.created_at DESC, p.id DESC LIMIT 50";

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("user_id", userId);

        var payments = new List<PaymentDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            payments.Add(ReadPayment(reader));
        }

        return payments;
    }

    public async Task<PaymentDto?> ConfirmPaymentAsync(
        Guid paymentId,
        bool succeeded,
        string? providerTransactionId,
        CancellationToken cancellationToken)
    {
        var (_, payment) = await ConfirmAsync(
            paymentId, succeeded, expectedAmount: null, requireAmount: false, providerTransactionId,
            cancellationToken);
        return payment;
    }

    public async Task<WebhookConfirmResult> ConfirmWebhookPaymentAsync(
        string provider,
        long providerOrderCode,
        bool succeeded,
        int? amount,
        string? providerTransactionId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id
            FROM payments
            WHERE provider = @provider AND provider_order_code = @provider_order_code
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("provider", provider);
        command.AddParameter("provider_order_code", providerOrderCode);

        if (await command.ExecuteScalarAsync(cancellationToken) is not Guid paymentId)
        {
            return new WebhookConfirmResult(PaymentConfirmOutcome.NotFound, null);
        }

        var (outcome, payment) = await ConfirmAsync(
            paymentId, succeeded, amount, requireAmount: true, providerTransactionId, cancellationToken);
        return new WebhookConfirmResult(outcome, payment);
    }

    // The one place a payment is settled, so the mock page and the payOS webhook apply exactly the
    // same rules. expectedAmount is what the provider reports it collected; requireAmount is set
    // on the webhook path, where a success carrying no usable amount counts as a mismatch.
    private async Task<(PaymentConfirmOutcome Outcome, PaymentDto? Payment)> ConfirmAsync(
        Guid paymentId,
        bool succeeded,
        int? expectedAmount,
        bool requireAmount,
        string? providerTransactionId,
        CancellationToken cancellationToken)
    {
        var outcome = PaymentConfirmOutcome.Applied;

        await using (var connection = await connectionFactory.OpenConnectionAsync(cancellationToken))
        await using (var transaction = await connection.BeginTransactionAsync(cancellationToken))
        {
            const string selectSql = """
                SELECT user_id, plan_code, status, expires_at, amount
                FROM payments
                WHERE id = @id
                FOR UPDATE
                """;

            Guid userId;
            string planCode;
            string status;
            DateTimeOffset expiresAt;
            int amount;
            await using (var select = CreateCommand(connection, transaction, selectSql))
            {
                select.AddParameter("id", paymentId);
                await using var reader = await select.ExecuteReaderAsync(cancellationToken);
                if (!await reader.ReadAsync(cancellationToken))
                {
                    return (PaymentConfirmOutcome.NotFound, null);
                }

                userId = reader.GetGuid(0);
                planCode = reader.GetString(1);
                status = reader.GetString(2);
                expiresAt = reader.GetFieldValue<DateTimeOffset>(3);
                amount = reader.GetInt32(4);
            }

            if (status != PaymentStatus.Pending)
            {
                // Already settled by an earlier callback. A repeat is fine, but money reported for
                // an order we already closed (failed/expired/refunded) must not grant Premium.
                outcome = succeeded && status != PaymentStatus.Paid
                    ? PaymentConfirmOutcome.NotPending
                    : PaymentConfirmOutcome.Applied;
            }
            else if (expiresAt <= DateTimeOffset.UtcNow)
            {
                await SetStatusAsync(connection, transaction, paymentId, PaymentStatus.Expired, cancellationToken);
                // Money can still arrive after we closed the order; that needs a human.
                outcome = succeeded ? PaymentConfirmOutcome.NotPending : PaymentConfirmOutcome.Applied;
            }
            else if (!succeeded)
            {
                await SetStatusAsync(connection, transaction, paymentId, PaymentStatus.Failed, cancellationToken);
            }
            else if (requireAmount && expectedAmount != amount)
            {
                // A webhook that reports success has to carry the amount we charged: a different
                // one, or none at all, grants nothing and leaves the order for someone to look at.
                outcome = PaymentConfirmOutcome.AmountMismatch;
            }
            else
            {
                var plan = Plans.All.First(p => p.Code == planCode);
                var subscriptionId = await ExtendSubscriptionAsync(
                    connection, transaction, userId, plan.DurationMonths, cancellationToken);

                const string paidSql = """
                    UPDATE payments
                    SET status = 'paid', paid_at = now(),
                        provider_transaction_id = @provider_transaction_id,
                        subscription_id = @subscription_id
                    WHERE id = @id
                    """;

                await using var paid = CreateCommand(connection, transaction, paidSql);
                paid.AddParameter("id", paymentId);
                paid.AddParameter("provider_transaction_id", providerTransactionId);
                paid.AddParameter("subscription_id", subscriptionId);
                await paid.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
        }

        return (outcome, await GetPaymentAsync(paymentId, null, cancellationToken));
    }

    public async Task<RefundResult> RefundAsync(
        Guid userId,
        Guid paymentId,
        RefundRequest request,
        CancellationToken cancellationToken)
    {
        await using (var connection = await connectionFactory.OpenConnectionAsync(cancellationToken))
        await using (var transaction = await connection.BeginTransactionAsync(cancellationToken))
        {
            // FOR UPDATE makes a second, concurrent refund of the same order wait and
            // then see "refunded" instead of refunding twice.
            const string selectSql = """
                SELECT plan_code, status, paid_at, provider, provider_transaction_id, amount, subscription_id
                FROM payments
                WHERE id = @id AND user_id = @user_id
                FOR UPDATE
                """;

            string planCode;
            string status;
            DateTimeOffset? paidAt;
            string provider;
            string? providerTransactionId;
            int amount;
            Guid? subscriptionId;
            await using (var select = CreateCommand(connection, transaction, selectSql))
            {
                select.AddParameter("id", paymentId);
                select.AddParameter("user_id", userId);
                await using var reader = await select.ExecuteReaderAsync(cancellationToken);
                if (!await reader.ReadAsync(cancellationToken))
                {
                    return RefundResult.Failure(RefundError.NotFound);
                }

                planCode = reader.GetString(0);
                status = reader.GetString(1);
                paidAt = reader.IsDBNull(2) ? null : reader.GetFieldValue<DateTimeOffset>(2);
                provider = reader.GetString(3);
                providerTransactionId = reader.IsDBNull(4) ? null : reader.GetString(4);
                amount = reader.GetInt32(5);
                subscriptionId = reader.IsDBNull(6) ? null : reader.GetGuid(6);
            }

            if (status == PaymentStatus.Refunded)
            {
                return RefundResult.Failure(RefundError.AlreadyRefunded);
            }

            if (status != PaymentStatus.Paid || paidAt is null)
            {
                return RefundResult.Failure(RefundError.NotPaid);
            }

            // Checked before the window: a request filed in time stays valid while it waits.
            await using (var pending = CreateCommand(
                connection,
                transaction,
                "SELECT EXISTS (SELECT 1 FROM payment_refund_requests WHERE payment_id = @id AND status = 'pending')"))
            {
                pending.AddParameter("id", paymentId);
                if (await pending.ExecuteScalarAsync(cancellationToken) is true)
                {
                    return RefundResult.Failure(RefundError.RefundPending);
                }
            }

            if (RefundDeadline(paidAt.Value) <= DateTimeOffset.UtcNow)
            {
                return RefundResult.Failure(RefundError.WindowExpired);
            }

            // Refund through the provider that took the money, not whichever one is
            // configured now.
            var gateway = gateways.FirstOrDefault(g => g.Name == provider);
            if (gateway is null)
            {
                return RefundResult.Failure(RefundError.GatewayNotConfigured);
            }

            // payOS cannot send the money back through its API: file the request for an admin.
            // The payment stays paid, and Premium untouched, until the admin approves it.
            if (!gateway.SupportsAutomaticRefund)
            {
                await using (var file = CreateCommand(
                    connection,
                    transaction,
                    """
                    INSERT INTO payment_refund_requests (payment_id, user_id, reason)
                    VALUES (@payment_id, @user_id, @reason)
                    """))
                {
                    file.AddParameter("payment_id", paymentId);
                    file.AddParameter("user_id", userId);
                    file.AddParameter("reason", NormalizeText(request.Reason));
                    await file.ExecuteNonQueryAsync(cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
                return RefundResult.Filed((await GetPaymentAsync(paymentId, userId, cancellationToken))!);
            }

            // Called while the row is locked so a concurrent request cannot slip in
            // between; a throw aborts the transaction before anything is written.
            string providerRefundId;
            try
            {
                providerRefundId = await gateway.RefundAsync(
                    paymentId, providerTransactionId, amount, cancellationToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                // Some providers (payOS) only give money back by hand.
                return RefundResult.Failure(RefundError.GatewayRejected);
            }

            const string refundSql = """
                UPDATE payments
                SET status = 'refunded', refunded_at = now(),
                    refund_reason = @refund_reason, provider_refund_id = @provider_refund_id
                WHERE id = @id
                """;

            await using (var refund = CreateCommand(connection, transaction, refundSql))
            {
                refund.AddParameter("id", paymentId);
                refund.AddParameter("refund_reason", NormalizeText(request.Reason));
                refund.AddParameter("provider_refund_id", providerRefundId);
                await refund.ExecuteNonQueryAsync(cancellationToken);
            }

            if (subscriptionId is { } id)
            {
                var plan = Plans.All.First(p => p.Code == planCode);
                await ShortenSubscriptionAsync(
                    connection, transaction, userId, id, plan.DurationMonths, cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
        }

        return RefundResult.Success((await GetPaymentAsync(paymentId, userId, cancellationToken))!);
    }

    public async Task<PagedResult<AdminRefundRequestDto>> GetRefundRequestsAsync(
        string? status,
        PageQuery paging,
        CancellationToken cancellationToken)
    {
        const string where = "WHERE (CAST(@status AS text) IS NULL OR r.status = @status)";

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        int totalCount;
        await using (var count = connection.CreateCommand())
        {
            count.CommandText = $"SELECT count(*) FROM payment_refund_requests r {where}";
            count.AddParameter("status", status);
            totalCount = checked((int)(long)(await count.ExecuteScalarAsync(cancellationToken))!);
        }

        await using var command = connection.CreateCommand();
        command.CommandText = $"{AdminRefundSelect} {AdminRefundFrom} {where} "
            + "ORDER BY r.created_at DESC, r.id DESC LIMIT @limit OFFSET @offset";
        command.AddParameter("status", status);
        command.AddParameter("limit", paging.PageSize);
        command.AddParameter("offset", paging.Offset);

        var items = new List<AdminRefundRequestDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(ReadAdminRefundRequest(reader));
        }

        return new PagedResult<AdminRefundRequestDto>(items, paging.Page, paging.PageSize, totalCount);
    }

    public async Task<ResolveRefundResult> ApproveRefundRequestAsync(
        Guid requestId,
        Guid adminId,
        ApproveRefundRequest request,
        CancellationToken cancellationToken)
    {
        await using (var connection = await connectionFactory.OpenConnectionAsync(cancellationToken))
        await using (var transaction = await connection.BeginTransactionAsync(cancellationToken))
        {
            // Locks the request so two admins approving at once cannot both refund.
            Guid paymentId;
            Guid userId;
            string? reason;
            await using (var select = CreateCommand(
                connection,
                transaction,
                """
                SELECT payment_id, user_id, reason
                FROM payment_refund_requests
                WHERE id = @id AND status = 'pending'
                FOR UPDATE
                """))
            {
                select.AddParameter("id", requestId);
                await using var reader = await select.ExecuteReaderAsync(cancellationToken);
                if (!await reader.ReadAsync(cancellationToken))
                {
                    return ResolveRefundResult.Failure(ResolveRefundError.NotFound);
                }

                paymentId = reader.GetGuid(0);
                userId = reader.GetGuid(1);
                reason = reader.IsDBNull(2) ? null : reader.GetString(2);
            }

            string planCode;
            Guid? subscriptionId;
            await using (var payment = CreateCommand(
                connection,
                transaction,
                "SELECT plan_code, status, subscription_id FROM payments WHERE id = @id FOR UPDATE"))
            {
                payment.AddParameter("id", paymentId);
                await using var reader = await payment.ExecuteReaderAsync(cancellationToken);
                await reader.ReadAsync(cancellationToken);
                if (reader.GetString(1) != PaymentStatus.Paid)
                {
                    return ResolveRefundResult.Failure(ResolveRefundError.PaymentNotPaid);
                }

                planCode = reader.GetString(0);
                subscriptionId = reader.IsDBNull(2) ? null : reader.GetGuid(2);
            }

            var transferReference = request.TransferReference.Trim();
            await using (var refund = CreateCommand(
                connection,
                transaction,
                """
                UPDATE payments
                SET status = 'refunded', refunded_at = now(),
                    refund_reason = @refund_reason, provider_refund_id = @provider_refund_id
                WHERE id = @id
                """))
            {
                refund.AddParameter("id", paymentId);
                refund.AddParameter("refund_reason", reason);
                refund.AddParameter("provider_refund_id", transferReference);
                await refund.ExecuteNonQueryAsync(cancellationToken);
            }

            if (subscriptionId is { } id)
            {
                var plan = Plans.All.First(p => p.Code == planCode);
                await ShortenSubscriptionAsync(
                    connection, transaction, userId, id, plan.DurationMonths, cancellationToken);
            }

            await using (var approve = CreateCommand(
                connection,
                transaction,
                """
                UPDATE payment_refund_requests
                SET status = 'approved', transfer_reference = @transfer_reference,
                    resolution_note = @note, resolved_by = @admin_id, resolved_at = now()
                WHERE id = @id
                """))
            {
                approve.AddParameter("id", requestId);
                approve.AddParameter("transfer_reference", transferReference);
                approve.AddParameter("note", NormalizeText(request.Note));
                approve.AddParameter("admin_id", adminId);
                await approve.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
        }

        return ResolveRefundResult.Success((await GetRefundRequestAsync(requestId, cancellationToken))!);
    }

    public async Task<ResolveRefundResult> RejectRefundRequestAsync(
        Guid requestId,
        Guid adminId,
        RejectRefundRequest request,
        CancellationToken cancellationToken)
    {
        await using (var connection = await connectionFactory.OpenConnectionAsync(cancellationToken))
        await using (var command = connection.CreateCommand())
        {
            command.CommandText = """
                UPDATE payment_refund_requests
                SET status = 'rejected', resolution_note = @note, resolved_by = @admin_id, resolved_at = now()
                WHERE id = @id AND status = 'pending'
                """;
            command.AddParameter("id", requestId);
            command.AddParameter("note", request.Note.Trim());
            command.AddParameter("admin_id", adminId);
            if (await command.ExecuteNonQueryAsync(cancellationToken) == 0)
            {
                return ResolveRefundResult.Failure(ResolveRefundError.NotFound);
            }
        }

        return ResolveRefundResult.Success((await GetRefundRequestAsync(requestId, cancellationToken))!);
    }

    private async Task<AdminRefundRequestDto?> GetRefundRequestAsync(Guid requestId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = $"{AdminRefundSelect} {AdminRefundFrom} WHERE r.id = @id";
        command.AddParameter("id", requestId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadAdminRefundRequest(reader) : null;
    }

    private static AdminRefundRequestDto ReadAdminRefundRequest(DbDataReader reader)
    {
        return new AdminRefundRequestDto(
            reader.GetGuid(0),
            reader.GetGuid(1),
            reader.GetGuid(2),
            reader.GetString(3),
            reader.GetString(4),
            reader.GetString(5),
            reader.GetInt32(6),
            reader.GetString(7),
            reader.GetString(8),
            reader.IsDBNull(9) ? null : reader.GetInt64(9),
            reader.IsDBNull(10) ? null : reader.GetString(10),
            reader.IsDBNull(11) ? null : reader.GetFieldValue<DateTimeOffset>(11),
            reader.GetString(12),
            reader.IsDBNull(13) ? null : reader.GetString(13),
            reader.GetString(14),
            reader.IsDBNull(15) ? null : reader.GetString(15),
            reader.IsDBNull(16) ? null : reader.GetString(16),
            reader.IsDBNull(17) ? null : reader.GetGuid(17),
            reader.GetFieldValue<DateTimeOffset>(18),
            reader.IsDBNull(19) ? null : reader.GetFieldValue<DateTimeOffset>(19));
    }

    private static string? NormalizeText(string? text)
    {
        return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
    }

    // The mirror of ExtendSubscriptionAsync: only the refunded order's months come off,
    // so days paid for by other, stacked orders are kept. When nothing is left the
    // subscription ends now.
    private static async Task ShortenSubscriptionAsync(
        DbConnection connection,
        DbTransaction transaction,
        Guid userId,
        Guid subscriptionId,
        int months,
        CancellationToken cancellationToken)
    {
        // Same lock as ExtendSubscriptionAsync, so a refund and a purchase of the same
        // user cannot interleave.
        await using (var lockUser = CreateCommand(connection, transaction, "SELECT 1 FROM users WHERE id = @user_id FOR UPDATE"))
        {
            lockUser.AddParameter("user_id", userId);
            await lockUser.ExecuteScalarAsync(cancellationToken);
        }

        const string sql = """
            UPDATE subscriptions
            SET ends_at = GREATEST(now(), ends_at - make_interval(months => @months)),
                status = CASE
                    WHEN ends_at - make_interval(months => @months) <= now() THEN 'cancelled'
                    ELSE status
                END
            WHERE id = @id
            """;

        await using var command = CreateCommand(connection, transaction, sql);
        command.AddParameter("id", subscriptionId);
        command.AddParameter("months", months);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    // Mints the provider's order code from a database sequence, so it is unique across app
    // instances and never repeats. The sequence starts at 1000000 — clear of payOS's sample 123 —
    // and stays far below the 2^53 ceiling JavaScript can hold.
    private async Task<long> NextProviderOrderCodeAsync(CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT nextval('payments_provider_order_code_seq')";
        return (long)(await command.ExecuteScalarAsync(cancellationToken))!;
    }

    // Same update as the static SetStatusAsync, for the paths that are not inside a transaction.
    private async Task SetStatusAsync(
        Guid paymentId,
        string status,
        CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE payments SET status = @status WHERE id = @id";
        command.AddParameter("id", paymentId);
        command.AddParameter("status", status);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private DateTimeOffset RefundDeadline(DateTimeOffset paidAt)
    {
        return paidAt.AddDays(options.Value.RefundWindowDays);
    }

    // Buying while already premium stacks onto the current end date instead of
    // overwriting it, so a user never loses days they already paid for.
    private static async Task<Guid> ExtendSubscriptionAsync(
        DbConnection connection,
        DbTransaction transaction,
        Guid userId,
        int months,
        CancellationToken cancellationToken)
    {
        // Serialises concurrent payments of the same user so two of them cannot both
        // see "no active subscription" and create two overlapping rows.
        await using (var lockUser = CreateCommand(connection, transaction, "SELECT 1 FROM users WHERE id = @user_id FOR UPDATE"))
        {
            lockUser.AddParameter("user_id", userId);
            await lockUser.ExecuteScalarAsync(cancellationToken);
        }

        Guid? activeId;
        await using (var select = CreateCommand(connection, transaction, ActiveSubscriptionSql))
        {
            select.AddParameter("user_id", userId);
            activeId = await select.ExecuteScalarAsync(cancellationToken) as Guid?;
        }

        if (activeId is { } existingId)
        {
            await using var extend = CreateCommand(
                connection,
                transaction,
                "UPDATE subscriptions SET ends_at = ends_at + make_interval(months => @months) WHERE id = @id");
            extend.AddParameter("id", existingId);
            extend.AddParameter("months", months);
            await extend.ExecuteNonQueryAsync(cancellationToken);
            return existingId;
        }

        const string insertSql = """
            INSERT INTO subscriptions (user_id, plan, status, starts_at, ends_at)
            VALUES (@user_id, 'premium', 'active', now(), now() + make_interval(months => @months))
            RETURNING id
            """;

        await using var insert = CreateCommand(connection, transaction, insertSql);
        insert.AddParameter("user_id", userId);
        insert.AddParameter("months", months);
        return (Guid)(await insert.ExecuteScalarAsync(cancellationToken))!;
    }

    private static async Task SetStatusAsync(
        DbConnection connection,
        DbTransaction transaction,
        Guid paymentId,
        string status,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(
            connection, transaction, "UPDATE payments SET status = @status WHERE id = @id");
        command.AddParameter("id", paymentId);
        command.AddParameter("status", status);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static DbCommand CreateCommand(DbConnection connection, DbTransaction transaction, string sql)
    {
        var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        return command;
    }

    private PaymentDto ReadPayment(DbDataReader reader)
    {
        var status = reader.GetString(5);
        var expiresAt = reader.GetFieldValue<DateTimeOffset>(7);
        var paidAt = reader.IsDBNull(8) ? (DateTimeOffset?)null : reader.GetFieldValue<DateTimeOffset>(8);
        var now = DateTimeOffset.UtcNow;

        // Abandoned checkouts are never called back, so they only become "expired" on read.
        if (status == PaymentStatus.Pending && expiresAt <= now)
        {
            status = PaymentStatus.Expired;
        }

        RefundRequestDto? refundRequest = reader.IsDBNull(10)
            ? null
            : new RefundRequestDto(
                reader.GetGuid(10),
                reader.GetString(11),
                reader.IsDBNull(12) ? null : reader.GetString(12),
                reader.IsDBNull(13) ? null : reader.GetString(13),
                reader.GetFieldValue<DateTimeOffset>(14),
                reader.IsDBNull(15) ? null : reader.GetFieldValue<DateTimeOffset>(15));

        // No refund is offered while a request already waits for an admin.
        DateTimeOffset? refundableUntil = null;
        if (status == PaymentStatus.Paid
            && paidAt is { } paid
            && RefundDeadline(paid) > now
            && refundRequest?.Status != RefundRequestStatus.Pending)
        {
            refundableUntil = RefundDeadline(paid);
        }

        return new PaymentDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetInt32(2),
            reader.GetString(3),
            reader.GetString(4),
            status,
            reader.GetFieldValue<DateTimeOffset>(6),
            expiresAt,
            paidAt,
            reader.IsDBNull(9) ? null : reader.GetFieldValue<DateTimeOffset>(9),
            refundableUntil,
            refundRequest);
    }
}
