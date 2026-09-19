using System.Data.Common;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Users.Services;

public sealed class UserService(IDbConnectionFactory connectionFactory) : IUserService
{
    private const string ProfileDetailColumns = """
        p.user_id, p.display_name, p.birth_date, p.gender, p.occupation, p.bio,
        p.city, p.district, p.avatar_url, p.is_verified, p.profile_completion, p.updated_at
        """;

    private const string LifestyleColumns = """
        user_id, sleep_schedule, cleanliness, social_style, smoking, pet_friendly,
        cooking_frequency, budget_min, budget_max, move_in_date, interests, updated_at
        """;

    public object GetModuleStatus()
    {
        return new
        {
            module = "Users",
            features = new[] { "auth", "profiles", "roles" }
        };
    }

    public async Task<IReadOnlyList<UserProfileDto>> GetProfilesAsync(CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT u.id, p.display_name, p.occupation, p.city, p.district,
                   p.avatar_url, p.is_verified, p.profile_completion
            FROM users u
            INNER JOIN profiles p ON p.user_id = u.id
            WHERE u.is_active = true AND u.role = 'member'
            ORDER BY p.is_verified DESC, p.display_name
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
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

        return profiles;
    }

    public async Task<ProfileDetailDto?> GetProfileAsync(Guid userId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        return await ReadProfileAsync(connection, userId, cancellationToken);
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

        var gender = Normalize(request.Gender);
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
                 cooking_frequency, budget_min, budget_max, move_in_date, interests, updated_at)
            VALUES
                (@user_id, @sleep_schedule, @cleanliness, @social_style, @smoking, @pet_friendly,
                 @cooking_frequency, @budget_min, @budget_max, @move_in_date, @interests, now())
            ON CONFLICT (user_id) DO UPDATE SET
                sleep_schedule = EXCLUDED.sleep_schedule,
                cleanliness = EXCLUDED.cleanliness,
                social_style = EXCLUDED.social_style,
                smoking = EXCLUDED.smoking,
                pet_friendly = EXCLUDED.pet_friendly,
                cooking_frequency = EXCLUDED.cooking_frequency,
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
        CancellationToken cancellationToken)
    {
        var sql = $"""
            SELECT {ProfileDetailColumns}
            FROM profiles p
            INNER JOIN users u ON u.id = p.user_id
            WHERE p.user_id = @user_id AND u.is_active = true
            """;

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("user_id", userId);

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
            reader.GetInt32(7),
            reader.GetInt32(8),
            reader.IsDBNull(9) ? null : reader.GetFieldValue<DateOnly>(9),
            reader.GetFieldValue<string[]>(10),
            reader.GetFieldValue<DateTimeOffset>(11));
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
