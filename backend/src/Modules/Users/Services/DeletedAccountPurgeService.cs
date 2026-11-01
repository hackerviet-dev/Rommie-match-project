using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RoomieMatch.Shared.Contracts;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Users.Services;

// Hard deletes accounts the member deleted themselves once the grace period has passed.
// Accounts soft deleted by staff (deleted_by is another user) wait for an admin decision.
// Each account's images go first; a storage failure leaves that row for the next run.
// Both steps are idempotent, so several API instances running this at once is harmless.
public sealed class DeletedAccountPurgeService(
    IDbConnectionFactory connectionFactory,
    IUserMediaEraser mediaEraser,
    ILogger<DeletedAccountPurgeService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                await PurgeDueAccountsAsync(stoppingToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Purging self-deleted accounts failed; retrying next hour.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task PurgeDueAccountsAsync(CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var due = new List<Guid>();
        await using (var select = connection.CreateCommand())
        {
            select.CommandText = "SELECT id FROM users WHERE deleted_by = id AND deleted_at < now() - make_interval(days => @days) LIMIT 100";
            select.AddParameter("days", AuthService.SelfDeletionGraceDays);
            await using var reader = await select.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                due.Add(reader.GetGuid(0));
            }
        }

        foreach (var userId in due)
        {
            if (!await mediaEraser.DeleteAllForUserAsync(userId, cancellationToken))
            {
                continue;
            }

            await using var delete = connection.CreateCommand();
            delete.CommandText = """
                WITH purged AS (
                    DELETE FROM users
                    WHERE id = @user_id AND deleted_by = id AND deleted_at < now() - make_interval(days => @days)
                    RETURNING id
                )
                INSERT INTO staff_audit_logs (actor_id, action, target_id, note)
                SELECT NULL, 'account.purge', id, 'Tự động xóa vĩnh viễn sau thời hạn chờ.' FROM purged
                """;
            delete.AddParameter("user_id", userId).AddParameter("days", AuthService.SelfDeletionGraceDays);
            if (await delete.ExecuteNonQueryAsync(cancellationToken) > 0)
            {
                logger.LogInformation("Purged self-deleted account {UserId}.", userId);
            }
        }
    }
}
