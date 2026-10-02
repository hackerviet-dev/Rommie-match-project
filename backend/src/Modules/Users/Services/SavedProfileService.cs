using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Services;

public sealed class SavedProfileService(IDbConnectionFactory connectionFactory) : ISavedProfileService
{
    // The same visibility rule as the discovery list (GET /api/users/profiles): an active,
    // public member profile that neither side has blocked. Saved rows whose profile later
    // turns hidden stay in the table and come back once the profile is visible again.
    private const string VisibleTarget = """
        u.is_active = true
        AND u.role = 'member'
        AND p.is_public = true
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks b
            WHERE b.deleted_at IS NULL
              AND ((b.blocker_id = @user_id AND b.blocked_id = u.id)
                OR (b.blocker_id = u.id AND b.blocked_id = @user_id)))
        """;

    // Saving again keeps the original saved time; saving after an unsave revives the
    // soft-deleted row instead of adding another.
    public async Task<SavedProfileError> SaveAsync(Guid userId, Guid targetId, CancellationToken cancellationToken)
    {
        if (targetId == userId)
        {
            return SavedProfileError.Self;
        }

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            WITH target AS (
                SELECT u.id
                FROM users u
                INNER JOIN profiles p ON p.user_id = u.id
                WHERE u.id = @target_id AND {VisibleTarget}
            ), upsert AS (
                INSERT INTO saved_profiles (user_id, saved_user_id)
                SELECT @user_id, id FROM target
                ON CONFLICT (user_id, saved_user_id) DO UPDATE
                    SET deleted_at = NULL, created_at = now()
                    WHERE saved_profiles.deleted_at IS NOT NULL
            )
            SELECT EXISTS (SELECT 1 FROM target)
            """;
        command.AddParameter("user_id", userId).AddParameter("target_id", targetId);
        var visible = (bool)(await command.ExecuteScalarAsync(cancellationToken))!;
        return visible ? SavedProfileError.None : SavedProfileError.NotFound;
    }

    // Idempotent: unsaving a profile that is not saved changes nothing.
    public async Task UnsaveAsync(Guid userId, Guid targetId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE saved_profiles SET deleted_at = now()
            WHERE user_id = @user_id AND saved_user_id = @target_id AND deleted_at IS NULL
            """;
        command.AddParameter("user_id", userId).AddParameter("target_id", targetId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<PagedResult<SavedProfileDto>> GetSavedAsync(
        Guid userId,
        PageQuery paging,
        CancellationToken cancellationToken)
    {
        // Shared by the count and the page so totalCount always matches the items.
        const string fromWhere = $"""
            FROM saved_profiles s
            INNER JOIN users u ON u.id = s.saved_user_id
            INNER JOIN profiles p ON p.user_id = u.id
            WHERE s.user_id = @user_id
              AND s.deleted_at IS NULL
              AND {VisibleTarget}
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);

        await using var countCommand = connection.CreateCommand();
        countCommand.CommandText = $"SELECT count(*) {fromWhere}";
        countCommand.AddParameter("user_id", userId);
        var totalCount = (int)(long)(await countCommand.ExecuteScalarAsync(cancellationToken))!;

        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT u.id, p.display_name, p.occupation, p.city, p.district,
                   p.avatar_url, p.is_verified, p.profile_completion, s.created_at
            {fromWhere}
            ORDER BY s.created_at DESC, u.id
            LIMIT @limit OFFSET @offset
            """;
        command
            .AddParameter("user_id", userId)
            .AddParameter("limit", paging.PageSize)
            .AddParameter("offset", paging.Offset);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var saved = new List<SavedProfileDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            saved.Add(new SavedProfileDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.GetBoolean(6),
                reader.GetInt16(7),
                reader.GetFieldValue<DateTimeOffset>(8)));
        }

        return new PagedResult<SavedProfileDto>(saved, paging.Page, paging.PageSize, totalCount);
    }

    // Lets the discovery and profile screens mark the bookmark button without paging.
    public async Task<IReadOnlyList<Guid>> GetSavedIdsAsync(Guid userId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT u.id
            FROM saved_profiles s
            INNER JOIN users u ON u.id = s.saved_user_id
            INNER JOIN profiles p ON p.user_id = u.id
            WHERE s.user_id = @user_id
              AND s.deleted_at IS NULL
              AND {VisibleTarget}
            ORDER BY s.created_at DESC, u.id
            """;
        command.AddParameter("user_id", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var ids = new List<Guid>();
        while (await reader.ReadAsync(cancellationToken))
        {
            ids.Add(reader.GetGuid(0));
        }

        return ids;
    }
}
