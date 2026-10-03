using System.Data.Common;
using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Services;

public sealed class SafetyService(IDbConnectionFactory connectionFactory) : ISafetyService
{
    // Blocking only writes user_blocks: profiles, matching, room search and chat already
    // read that table in both directions, so the two members disappear for each other at once.
    // Re-blocking after an unblock revives the soft-deleted row instead of adding another.
    public async Task<SafetyError> BlockAsync(Guid userId, Guid targetId, CancellationToken cancellationToken)
    {
        if (targetId == userId)
        {
            return SafetyError.Self;
        }

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var role = await ReadRoleAsync(connection, targetId, cancellationToken);
        if (role is null)
        {
            return SafetyError.NotFound;
        }

        if (role != "member")
        {
            return SafetyError.StaffTarget;
        }

        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO user_blocks (blocker_id, blocked_id)
            VALUES (@user_id, @target_id)
            ON CONFLICT (blocker_id, blocked_id) DO UPDATE
                SET deleted_at = NULL, created_at = now()
                WHERE user_blocks.deleted_at IS NOT NULL
            """;
        command.AddParameter("user_id", userId).AddParameter("target_id", targetId);
        await command.ExecuteNonQueryAsync(cancellationToken);
        return SafetyError.None;
    }

    // Idempotent: unblocking someone who is not blocked changes nothing.
    public async Task UnblockAsync(Guid userId, Guid targetId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE user_blocks SET deleted_at = now()
            WHERE blocker_id = @user_id AND blocked_id = @target_id AND deleted_at IS NULL
            """;
        command.AddParameter("user_id", userId).AddParameter("target_id", targetId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<PagedResult<BlockedUserDto>> GetBlocksAsync(
        Guid userId,
        PageQuery paging,
        CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);

        await using var countCommand = connection.CreateCommand();
        countCommand.CommandText = "SELECT count(*) FROM user_blocks WHERE blocker_id = @user_id AND deleted_at IS NULL";
        countCommand.AddParameter("user_id", userId);
        var totalCount = (int)(long)(await countCommand.ExecuteScalarAsync(cancellationToken))!;

        // Hidden or deactivated members stay listed: the list exists so the member can undo a block.
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT b.blocked_id, COALESCE(p.display_name, 'Thành viên'), p.avatar_url, b.created_at
            FROM user_blocks b
            LEFT JOIN profiles p ON p.user_id = b.blocked_id
            WHERE b.blocker_id = @user_id AND b.deleted_at IS NULL
            ORDER BY b.created_at DESC, b.blocked_id
            LIMIT @limit OFFSET @offset
            """;
        command
            .AddParameter("user_id", userId)
            .AddParameter("limit", paging.PageSize)
            .AddParameter("offset", paging.Offset);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var blocks = new List<BlockedUserDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            blocks.Add(new BlockedUserDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.GetFieldValue<DateTimeOffset>(3)));
        }

        return new PagedResult<BlockedUserDto>(blocks, paging.Page, paging.PageSize, totalCount);
    }

    // Any account except oneself can be reported, including a hidden or blocked member:
    // reporting often follows a block. One open report per reporter and member keeps the
    // moderation queue free of repeats; once moderators close it, a new one is allowed.
    public async Task<SafetyResult<UserReportDto>> ReportAsync(
        Guid userId,
        Guid targetId,
        CreateUserReportRequest request,
        CancellationToken cancellationToken)
    {
        if (targetId == userId)
        {
            return SafetyResult<UserReportDto>.Failure(SafetyError.Self);
        }

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        if (await ReadRoleAsync(connection, targetId, cancellationToken) is null)
        {
            return SafetyResult<UserReportDto>.Failure(SafetyError.NotFound);
        }

        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO user_reports (reporter_id, reported_user_id, reason, details)
            SELECT @user_id, @target_id, @reason, @details
            WHERE NOT EXISTS (
                SELECT 1 FROM user_reports
                WHERE reporter_id = @user_id AND reported_user_id = @target_id AND status = 'open')
            RETURNING id, reported_user_id, reason, details, status, created_at
            """;
        command
            .AddParameter("user_id", userId)
            .AddParameter("target_id", targetId)
            .AddParameter("reason", request.Reason)
            .AddParameter("details", string.IsNullOrWhiteSpace(request.Details) ? null : request.Details.Trim());

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return SafetyResult<UserReportDto>.Failure(SafetyError.ReportAlreadyOpen);
        }

        return SafetyResult<UserReportDto>.Success(new UserReportDto(
            reader.GetGuid(0),
            reader.GetGuid(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.GetString(4),
            reader.GetFieldValue<DateTimeOffset>(5)));
    }

    private static async Task<string?> ReadRoleAsync(
        DbConnection connection,
        Guid userId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT role FROM users WHERE id = @user_id";
        command.AddParameter("user_id", userId);
        return await command.ExecuteScalarAsync(cancellationToken) as string;
    }
}
