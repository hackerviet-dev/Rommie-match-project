using System.Data.Common;
using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Services;

public sealed class UserService(IDbConnectionFactory connectionFactory) : IUserService
{
    private const string ProfileDetailColumns = """
        p.user_id, p.display_name, p.birth_date, p.gender, p.occupation, p.bio,
        p.city, p.district, p.avatar_url, p.is_verified, p.profile_completion, p.updated_at
        """;

    private const string LifestyleColumns = """
        user_id, sleep_schedule, cleanliness, social_style, smoking, pet_friendly,
        cooking_frequency, room_environment, budget_min, budget_max, move_in_date, interests,
        updated_at
        """;

    public object GetModuleStatus()
    {
        return new
        {
            module = "Users",
            features = new[] { "auth", "profiles", "roles" }
        };
    }

    public async Task<PagedResult<UserProfileDto>> GetProfilesAsync(
        Guid viewerId,
        PageQuery paging,
        CancellationToken cancellationToken)
    {
        // BR-07 ("loại tài khoản không hoạt động hoặc bị chặn theo chính sách") applies to the
        // discovery list too: a one-way block hides both members from each other, exactly like
        // the matching list, the room search, chat and GET /api/users/{userId}/profile. It reuses
        // the existing user_blocks table and the viewer id from the token; no block/report member
        // API is introduced here. The clause is folded into the shared FROM/WHERE, so the count
        // and the page always agree on totalCount.
        const string fromWhere = """
            FROM users u
            INNER JOIN profiles p ON p.user_id = u.id
            WHERE u.is_active = true
              AND u.role = 'member'
              AND p.is_public = true
              AND u.id <> @viewer_id
              AND NOT EXISTS (
                  SELECT 1 FROM user_blocks b
                  WHERE b.deleted_at IS NULL
                    AND ((b.blocker_id = @viewer_id AND b.blocked_id = u.id)
                      OR (b.blocker_id = u.id AND b.blocked_id = @viewer_id)))
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);

        await using var countCommand = connection.CreateCommand();
        countCommand.CommandText = $"SELECT count(*) {fromWhere}";
        countCommand.AddParameter("viewer_id", viewerId);
        var totalCount = (int)(long)(await countCommand.ExecuteScalarAsync(cancellationToken))!;

        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT u.id, p.display_name, p.occupation, p.city, p.district,
                   p.avatar_url, p.is_verified, p.profile_completion
            {fromWhere}
            ORDER BY p.is_verified DESC, p.display_name, u.id
            LIMIT @limit OFFSET @offset
            """;
        command
            .AddParameter("viewer_id", viewerId)
            .AddParameter("limit", paging.PageSize)
            .AddParameter("offset", paging.Offset);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var profiles = new List<UserProfileDto>();

        while (await reader.ReadAsync(cancellationToken))
        {
            profiles.Add(new UserProfileDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.GetBoolean(6),
                reader.GetInt16(7)));
        }

        return new PagedResult<UserProfileDto>(profiles, paging.Page, paging.PageSize, totalCount);
    }

    public async Task<ProfileDetailDto?> GetProfileAsync(Guid userId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        return await ReadProfileAsync(connection, userId, cancellationToken);
    }

    public async Task<ProfileDetailDto?> GetVisibleProfileAsync(
        Guid viewerId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        // A private profile answers 404 to others, the same as a missing one, so its
        // existence is not revealed. Its owner still sees it.
        // A block is hidden too: every other read path (the matching list, the room search and
        // chat) already treats two members who blocked each other as invisible to each other,
        // and GET /api/users/{userId}/profile documents "bị chặn" as a 404. The owner flag keeps
        // the viewer's own profile readable no matter what.
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var isOwner = viewerId == userId;
        return await ReadProfileAsync(
            connection,
            userId,
            cancellationToken,
            publicOnly: !isOwner,
            viewerId: isOwner ? null : viewerId);
    }

    public async Task<ProfileDetailDto?> UpdateProfileAsync(
        Guid userId,
        UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE profiles SET
                display_name = @display_name,
                birth_date = @birth_date,
                gender = @gender,
                occupation = @occupation,
                bio = @bio,
                city = @city,
                district = @district,
                avatar_url = @avatar_url,
                profile_completion = @profile_completion
            WHERE user_id = @user_id
            """;

        var gender = Gender.ToCode(request.Gender);
        var occupation = Normalize(request.Occupation);
        var bio = Normalize(request.Bio);
        var district = Normalize(request.District);

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command
            .AddParameter("user_id", userId)
            .AddParameter("display_name", request.DisplayName.Trim())
            .AddParameter("birth_date", request.BirthDate)
            .AddParameter("gender", gender)
            .AddParameter("occupation", occupation)
            .AddParameter("bio", bio)
            .AddParameter("city", request.City.Trim())
            .AddParameter("district", district)
            .AddParameter("avatar_url", Normalize(request.AvatarUrl))
            .AddParameter(
                "profile_completion",
                ProfileCompletion.Calculate(request.BirthDate, gender, occupation, district, bio));

        if (await command.ExecuteNonQueryAsync(cancellationToken) == 0)
        {
            return null;
        }

        return await ReadProfileAsync(connection, userId, cancellationToken);
    }

    public async Task<LifestylePreferencesDto?> GetLifestylePreferencesAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        // A lifestyle_preferences row may carry only the onboarding housing-need fields with
        // sleep_schedule NULL. That row is not a submitted lifestyle questionnaire, so it is
        // treated as "chưa khai" (404), exactly like a missing row.
        var sql = $"""
            SELECT {LifestyleColumns}
            FROM lifestyle_preferences
            WHERE user_id = @user_id AND sleep_schedule IS NOT NULL
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("user_id", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadLifestyle(reader) : null;
    }

    public async Task<LifestylePreferencesDto> SaveLifestylePreferencesAsync(
        Guid userId,
        SaveLifestylePreferencesRequest request,
        CancellationToken cancellationToken)
    {
        var sql = $"""
            INSERT INTO lifestyle_preferences
                (user_id, sleep_schedule, cleanliness, social_style, smoking, pet_friendly,
                 cooking_frequency, room_environment, budget_min, budget_max, move_in_date,
                 interests, updated_at)
            VALUES
                (@user_id, @sleep_schedule, @cleanliness, @social_style, @smoking, @pet_friendly,
                 @cooking_frequency, @room_environment, @budget_min, @budget_max, @move_in_date,
                 @interests, now())
            ON CONFLICT (user_id) DO UPDATE SET
                sleep_schedule = EXCLUDED.sleep_schedule,
                cleanliness = EXCLUDED.cleanliness,
                social_style = EXCLUDED.social_style,
                smoking = EXCLUDED.smoking,
                pet_friendly = EXCLUDED.pet_friendly,
                cooking_frequency = EXCLUDED.cooking_frequency,
                room_environment = EXCLUDED.room_environment,
                budget_min = EXCLUDED.budget_min,
                budget_max = EXCLUDED.budget_max,
                move_in_date = EXCLUDED.move_in_date,
                interests = EXCLUDED.interests,
                updated_at = now()
            RETURNING {LifestyleColumns}
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command
            .AddParameter("user_id", userId)
            .AddParameter("sleep_schedule", request.SleepSchedule.Trim())
            .AddParameter("cleanliness", (short)request.Cleanliness)
            .AddParameter("social_style", request.SocialStyle.Trim())
            .AddParameter("smoking", request.Smoking)
            .AddParameter("pet_friendly", request.PetFriendly)
            .AddParameter("cooking_frequency", Normalize(request.CookingFrequency))
            .AddParameter("room_environment", request.RoomEnvironment)
            .AddParameter("budget_min", request.BudgetMin)
            .AddParameter("budget_max", request.BudgetMax)
            .AddParameter("move_in_date", request.MoveInDate)
            .AddParameter("interests", NormalizeInterests(request.Interests));

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return ReadLifestyle(reader);
    }

    public async Task<HousingNeedsDto?> GetHousingNeedsAsync(Guid userId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT p.user_id, p.has_room, p.occupation_status, p.organization_name, p.hide_organization,
                   lp.drinking, lp.preferred_distance, lp.preferred_room_type
            FROM profiles p
            LEFT JOIN lifestyle_preferences lp ON lp.user_id = p.user_id
            WHERE p.user_id = @user_id
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("user_id", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadHousingNeeds(reader) : null;
    }

    public async Task<HousingNeedsDto?> SaveHousingNeedsAsync(
        Guid userId,
        SaveHousingNeedsRequest request,
        CancellationToken cancellationToken)
    {
        // Four of the fields live on profiles, three on lifestyle_preferences; both writes
        // must land together, so they share one transaction.
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using (var transaction = await connection.BeginTransactionAsync(cancellationToken))
        {
            // Every registered member has a profile row; a missing one is a 404, not a 500.
            await using (var profile = connection.CreateCommand())
            {
                profile.Transaction = transaction;
                profile.CommandText = """
                    UPDATE profiles SET
                        has_room = @has_room,
                        occupation_status = @occupation_status,
                        organization_name = @organization_name,
                        hide_organization = @hide_organization
                    WHERE user_id = @user_id
                    """;
                profile
                    .AddParameter("user_id", userId)
                    .AddParameter("has_room", request.HasRoom)
                    .AddParameter("occupation_status", Normalize(request.OccupationStatus))
                    .AddParameter("organization_name", Normalize(request.OrganizationName))
                    .AddParameter("hide_organization", request.HideOrganization);

                if (await profile.ExecuteNonQueryAsync(cancellationToken) == 0)
                {
                    return null;
                }
            }

            // The three preference fields reuse the lifestyle_preferences row. For a member who
            // has not submitted the lifestyle questionnaire yet the insert leaves the other
            // preference columns NULL ("chưa khai") rather than fabricating them, so the row is
            // excluded from matching and from GET /me/lifestyle until sleep_schedule is written.
            await using (var preferences = connection.CreateCommand())
            {
                preferences.Transaction = transaction;
                preferences.CommandText = """
                    INSERT INTO lifestyle_preferences
                        (user_id, drinking, preferred_distance, preferred_room_type, updated_at)
                    VALUES (@user_id, @drinking, @preferred_distance, @preferred_room_type, now())
                    ON CONFLICT (user_id) DO UPDATE SET
                        drinking = EXCLUDED.drinking,
                        preferred_distance = EXCLUDED.preferred_distance,
                        preferred_room_type = EXCLUDED.preferred_room_type,
                        updated_at = now()
                    """;
                preferences
                    .AddParameter("user_id", userId)
                    .AddParameter("drinking", request.Drinking)
                    .AddParameter("preferred_distance", Normalize(request.PreferredDistance))
                    .AddParameter("preferred_room_type", Normalize(request.PreferredRoomType));

                await preferences.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
        }

        return await GetHousingNeedsAsync(userId, cancellationToken);
    }

    private static async Task<ProfileDetailDto?> ReadProfileAsync(
        DbConnection connection,
        Guid userId,
        CancellationToken cancellationToken,
        bool publicOnly = false,
        Guid? viewerId = null)
    {
        // publicOnly hides a profile from other members; viewerId additionally hides it while
        // either member has blocked the other. Both are off by default, so the owner's own reads
        // (GET /me/profile, the read-back after PUT) never change behaviour.
        var blockClause = viewerId is null
            ? string.Empty
            : "AND NOT EXISTS (SELECT 1 FROM user_blocks b "
              + "WHERE b.deleted_at IS NULL "
              + "AND ((b.blocker_id = @viewer_id AND b.blocked_id = p.user_id) "
              + "OR (b.blocker_id = p.user_id AND b.blocked_id = @viewer_id)))";

        var sql = $"""
            SELECT {ProfileDetailColumns}
            FROM profiles p
            INNER JOIN users u ON u.id = p.user_id
            WHERE p.user_id = @user_id AND u.is_active = true
            {(publicOnly ? "AND p.is_public = true" : "")}
            {blockClause}
            """;

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("user_id", userId);
        if (viewerId is { } viewer)
        {
            command.AddParameter("viewer_id", viewer);
        }

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new ProfileDetailDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetFieldValue<DateOnly>(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.IsDBNull(4) ? null : reader.GetString(4),
            reader.IsDBNull(5) ? null : reader.GetString(5),
            reader.GetString(6),
            reader.IsDBNull(7) ? null : reader.GetString(7),
            reader.IsDBNull(8) ? null : reader.GetString(8),
            reader.GetBoolean(9),
            reader.GetInt16(10),
            reader.GetFieldValue<DateTimeOffset>(11));
    }

    private static LifestylePreferencesDto ReadLifestyle(DbDataReader reader)
    {
        return new LifestylePreferencesDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetInt16(2),
            reader.GetString(3),
            reader.GetBoolean(4),
            reader.GetBoolean(5),
            reader.IsDBNull(6) ? null : reader.GetString(6),
            reader.IsDBNull(7) ? null : reader.GetString(7),
            reader.GetInt32(8),
            reader.GetInt32(9),
            reader.IsDBNull(10) ? null : reader.GetFieldValue<DateOnly>(10),
            reader.GetFieldValue<string[]>(11),
            reader.GetFieldValue<DateTimeOffset>(12));
    }

    private static HousingNeedsDto ReadHousingNeeds(DbDataReader reader)
    {
        return new HousingNeedsDto(
            reader.GetGuid(0),
            reader.IsDBNull(1) ? null : reader.GetBoolean(1),
            reader.IsDBNull(2) ? null : reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.GetBoolean(4),
            reader.IsDBNull(5) ? null : reader.GetBoolean(5),
            reader.IsDBNull(6) ? null : reader.GetString(6),
            reader.IsDBNull(7) ? null : reader.GetString(7));
    }

    private static string[] NormalizeInterests(string[]? interests)
    {
        if (interests is null)
        {
            return [];
        }

        return interests
            // Null/trắng elements are dropped here as well as rejected by validation, so a
            // bad array can never reach Trim() and fail the insert with a 500.
            .Where(interest => !string.IsNullOrWhiteSpace(interest))
            .Select(interest => interest.Trim())
            .Distinct()
            .ToArray();
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
