using RoomieMatch.Shared.Contracts;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Billing.Services;

public sealed class PremiumStatus(IDbConnectionFactory connectionFactory) : IPremiumStatus
{
    public async Task<bool> IsPremiumAsync(Guid userId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = BillingService.ActiveSubscriptionSql;
        command.AddParameter("user_id", userId);

        return await command.ExecuteScalarAsync(cancellationToken) is not null;
    }
}
