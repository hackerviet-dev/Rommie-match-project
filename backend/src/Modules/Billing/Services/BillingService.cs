using System.Data.Common;
using Microsoft.Extensions.Options;
using RoomieMatch.Modules.Billing.Gateways;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Billing.Services;

public sealed class BillingService(
    IDbConnectionFactory connectionFactory,
    IEnumerable<IPaymentGateway> gateways,
    IOptions<BillingOptions> options) : IBillingService
{
    private const string PaymentColumns = """
        id, plan_code, amount, currency, provider, status, created_at, expires_at, paid_at
        """;

    private const string ActiveSubscriptionSql = """
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
            features = new[] { "plans", "checkout", "subscriptions", "payment-history" }
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

        const string sql = """
            INSERT INTO payments (user_id, plan_code, amount, currency, provider, expires_at)
            VALUES (@user_id, @plan_code, @amount, @currency, @provider, @expires_at)
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
        command.AddParameter("expires_at", expiresAt);

        var paymentId = (Guid)(await command.ExecuteScalarAsync(cancellationToken))!;

        return CheckoutResult.Success(new CheckoutResponse(
            paymentId,
            plan.Code,
            plan.Price,
            plan.Currency,
            gateway.CreatePaymentUrl(paymentId, plan),
            expiresAt));
    }

    public async Task<PaymentDto?> GetPaymentAsync(
        Guid paymentId,
        Guid? ownerUserId,
        CancellationToken cancellationToken)
    {
        var sql = $"SELECT {PaymentColumns} FROM payments WHERE id = @id"
            + (ownerUserId is null ? string.Empty : " AND user_id = @user_id");

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
        var sql = $"SELECT {PaymentColumns} FROM payments WHERE user_id = @user_id ORDER BY created_at DESC LIMIT 50";

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
        await using (var connection = await connectionFactory.OpenConnectionAsync(cancellationToken))
        await using (var transaction = await connection.BeginTransactionAsync(cancellationToken))
        {
            const string selectSql = """
                SELECT user_id, plan_code, status, expires_at
                FROM payments
                WHERE id = @id
                FOR UPDATE
                """;

            Guid userId;
            string planCode;
            string status;
            DateTimeOffset expiresAt;
            await using (var select = CreateCommand(connection, transaction, selectSql))
            {
                select.AddParameter("id", paymentId);
                await using var reader = await select.ExecuteReaderAsync(cancellationToken);
                if (!await reader.ReadAsync(cancellationToken))
                {
                    return null;
                }

                userId = reader.GetGuid(0);
                planCode = reader.GetString(1);
                status = reader.GetString(2);
                expiresAt = reader.GetFieldValue<DateTimeOffset>(3);
            }

            if (status != PaymentStatus.Pending)
            {
                // Already settled by an earlier callback; nothing to apply.
            }
            else if (expiresAt <= DateTimeOffset.UtcNow)
            {
                await SetStatusAsync(connection, transaction, paymentId, PaymentStatus.Expired, cancellationToken);
            }
            else if (!succeeded)
            {
                await SetStatusAsync(connection, transaction, paymentId, PaymentStatus.Failed, cancellationToken);
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

        return await GetPaymentAsync(paymentId, null, cancellationToken);
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

    private static PaymentDto ReadPayment(DbDataReader reader)
    {
        var status = reader.GetString(5);
        var expiresAt = reader.GetFieldValue<DateTimeOffset>(7);

        // Abandoned checkouts are never called back, so they only become "expired" on read.
        if (status == PaymentStatus.Pending && expiresAt <= DateTimeOffset.UtcNow)
        {
            status = PaymentStatus.Expired;
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
            reader.IsDBNull(8) ? null : reader.GetFieldValue<DateTimeOffset>(8));
    }
}
