using RoomieMatch.Modules.Users.Authentication;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Users.Services;

public sealed class AuthService(
    IDbConnectionFactory connectionFactory,
    PasswordHashService passwordHashService,
    ITokenService tokenService) : IAuthService
{
    public async Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var displayName = request.DisplayName.Trim();

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        const string insertUserSql = """
            INSERT INTO users (email, password_hash, role, auth_provider)
            VALUES (@email, @password_hash, 'member', 'local')
            ON CONFLICT (email) DO NOTHING
            RETURNING id
            """;

        await using var insertUser = connection.CreateCommand();
        insertUser.Transaction = transaction;
        insertUser.CommandText = insertUserSql;
        insertUser.AddParameter("email", email);
        insertUser.AddParameter("password_hash", passwordHashService.Hash(request.Password));

        if (await insertUser.ExecuteScalarAsync(cancellationToken) is not Guid userId)
        {
            return AuthResult.Failure(AuthError.EmailAlreadyRegistered);
        }

        var avatarUrl = BuildAvatarUrl(displayName);
        var profileCompletion = ProfileCompletion.Calculate(
            request.BirthDate,
            request.Gender,
            request.Occupation,
            request.District,
            bio: null);

        const string insertProfileSql = """
            INSERT INTO profiles
                (user_id, display_name, birth_date, gender, occupation, city, district, avatar_url, profile_completion)
            VALUES
                (@user_id, @display_name, @birth_date, @gender, @occupation, @city, @district, @avatar_url, @profile_completion)
            """;

        await using var insertProfile = connection.CreateCommand();
        insertProfile.Transaction = transaction;
        insertProfile.CommandText = insertProfileSql;
        insertProfile.AddParameter("user_id", userId);
        insertProfile.AddParameter("display_name", displayName);
        insertProfile.AddParameter("birth_date", request.BirthDate);
        insertProfile.AddParameter("gender", Normalize(request.Gender));
        insertProfile.AddParameter("occupation", Normalize(request.Occupation));
        insertProfile.AddParameter("city", request.City.Trim());
        insertProfile.AddParameter("district", Normalize(request.District));
        insertProfile.AddParameter("avatar_url", avatarUrl);
        insertProfile.AddParameter("profile_completion", profileCompletion);

        await insertProfile.ExecuteNonQueryAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var user = new AuthenticatedUserDto(
            userId,
            email,
            "member",
            displayName,
            avatarUrl,
            request.City.Trim(),
            Normalize(request.District),
            profileCompletion);

        return AuthResult.Success(CreateSession(user));
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT u.id, u.email, u.role, u.password_hash, u.is_active,
                   p.display_name, p.avatar_url, p.city, p.district, p.profile_completion
            FROM users u
            INNER JOIN profiles p ON p.user_id = u.id
            WHERE u.email = @email
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("email", request.Email.Trim().ToLowerInvariant());

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return AuthResult.Failure(AuthError.InvalidCredentials);
        }

        if (reader.IsDBNull(3) || !passwordHashService.Verify(reader.GetString(3), request.Password))
        {
            return AuthResult.Failure(AuthError.InvalidCredentials);
        }

        if (!reader.GetBoolean(4))
        {
            return AuthResult.Failure(AuthError.AccountDisabled);
        }

        var user = new AuthenticatedUserDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(5),
            reader.IsDBNull(6) ? null : reader.GetString(6),
            reader.GetString(7),
            reader.IsDBNull(8) ? null : reader.GetString(8),
            reader.GetInt16(9));

        return AuthResult.Success(CreateSession(user));
    }

    public async Task<AuthenticatedUserDto?> GetAuthenticatedUserAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT u.id, u.email, u.role,
                   p.display_name, p.avatar_url, p.city, p.district, p.profile_completion
            FROM users u
            INNER JOIN profiles p ON p.user_id = u.id
            WHERE u.id = @user_id AND u.is_active = true
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("user_id", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new AuthenticatedUserDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.IsDBNull(4) ? null : reader.GetString(4),
            reader.GetString(5),
            reader.IsDBNull(6) ? null : reader.GetString(6),
            reader.GetInt16(7));
    }

    private AuthSessionDto CreateSession(AuthenticatedUserDto user)
    {
        var accessToken = tokenService.CreateAccessToken(user.Id, user.Email, user.Role);
        return new AuthSessionDto(accessToken.Value, "Bearer", accessToken.ExpiresAt, user);
    }

    private static string BuildAvatarUrl(string displayName)
    {
        return $"https://api.dicebear.com/9.x/avataaars/svg?seed={Uri.EscapeDataString(displayName)}";
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
