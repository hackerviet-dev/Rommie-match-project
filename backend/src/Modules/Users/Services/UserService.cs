using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Users.Services;

public sealed class UserService(IDbConnectionFactory connectionFactory) : IUserService
{
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
            SELECT u.id, u.email, p.display_name, p.occupation, p.city, p.district,
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
                reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.IsDBNull(6) ? null : reader.GetString(6),
                reader.GetBoolean(7),
                reader.GetInt16(8)));
        }

        return profiles;
    }
}
