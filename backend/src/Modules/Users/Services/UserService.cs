using System.Data.Common;
using System.Text.Json;
using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Services;

public sealed class UserService(IDbConnectionFactory connectionFactory) : IUserService
{
    private const string ProfileDetailColumns = """
        p.user_id, p.display_name, p.birth_date, p.gender, p.occupation, p.bio,
        p.city, p.district, p.avatar_url, p.is_verified, p.profile_completion, p.updated_at, p.birth_year
        """;

    private const string LifestyleColumns = """
        user_id, sleep_schedule, cleanliness, social_style, smoking, pet_friendly,
        cooking_frequency, room_environment, budget_min, budget_max, move_in_date, interests,
        updated_at, drinking, extroversion, preferred_distance, preferred_room_type
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
        const string fromWhere = """
            FROM users u
            INNER JOIN profiles p ON p.user_id = u.id
            WHERE u.is_active = true
              AND u.role = 'member'
              AND p.is_public = true
              AND u.id <> @viewer_id
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
        var profile = await ReadProfileAsync(connection, userId, cancellationToken);
        return profile is null ? null : profile with { Lifestyle = await GetLifestylePreferencesAsync(userId, cancellationToken) };
    }

    public async Task<ProfileDetailDto?> GetVisibleProfileAsync(
        Guid viewerId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        // A private profile answers 404 to others, the same as a missing one, so its
        // existence is not revealed. Its owner still sees it.
        if (viewerId == userId) return await GetProfileAsync(userId, cancellationToken);
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        return await ReadProfileAsync(connection, userId, cancellationToken, publicOnly: viewerId != userId);
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
        var sql = $"SELECT {LifestyleColumns} FROM lifestyle_preferences WHERE user_id = @user_id";

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

    private static async Task<ProfileDetailDto?> ReadProfileAsync(
        DbConnection connection,
        Guid userId,
        CancellationToken cancellationToken,
        bool publicOnly = false)
    {
        var sql = $"""
            SELECT {ProfileDetailColumns},
                CASE WHEN @owner THEN p.occupation_status END,
                CASE WHEN @owner THEN p.organization_name END,
                CASE WHEN @owner THEN p.hide_organization END,
                CASE WHEN @owner THEN p.has_room END,
                CASE WHEN @owner THEN p.onboarding_completed_at END,
                CASE WHEN @owner THEN p.onboarding_data::text END
            FROM profiles p
            INNER JOIN users u ON u.id = p.user_id
            WHERE p.user_id = @user_id AND u.is_active = true
            {(publicOnly ? "AND p.is_public = true" : "")}
            """;

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("user_id", userId);
        command.AddParameter("owner", !publicOnly);

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
            reader.GetFieldValue<DateTimeOffset>(11),
            reader.IsDBNull(12) ? null : reader.GetInt16(12))
        {
            OccupationStatus = reader.IsDBNull(13) ? null : reader.GetString(13),
            OrganizationName = reader.IsDBNull(14) ? null : reader.GetString(14),
            HideOrganization = reader.IsDBNull(15) ? null : reader.GetBoolean(15),
            HasRoom = reader.IsDBNull(16) ? null : reader.GetBoolean(16),
            OnboardingCompletedAt = reader.IsDBNull(17) ? null : reader.GetFieldValue<DateTimeOffset>(17),
            Onboarding = reader.IsDBNull(18) ? null : JsonSerializer.Deserialize<OnboardingRequest>(reader.GetString(18), new JsonSerializerOptions(JsonSerializerDefaults.Web)),
        };
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
            reader.GetFieldValue<DateTimeOffset>(12),
            reader.GetBoolean(13),
            reader.IsDBNull(14) ? null : reader.GetInt16(14),
            reader.IsDBNull(15) ? null : reader.GetString(15),
            reader.IsDBNull(16) ? null : reader.GetString(16));
    }

    private static string[] NormalizeInterests(string[]? interests)
    {
        if (interests is null)
        {
            return [];
        }

        return interests
            .Select(interest => interest.Trim())
            .Where(interest => interest.Length > 0)
            .Distinct()
            .ToArray();
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
