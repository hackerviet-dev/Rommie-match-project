using System.Data.Common;
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

        var user = new AuthenticatedUserDto(
            userId,
            email,
            "member",
            displayName,
            avatarUrl,
            request.City.Trim(),
            Normalize(request.District),
            profileCompletion);

        var session = await CreateSessionAsync(connection, transaction, user, cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return AuthResult.Success(session);
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

        AuthenticatedUserDto user;
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
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

            user = new AuthenticatedUserDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(5),
                reader.IsDBNull(6) ? null : reader.GetString(6),
                reader.GetString(7),
                reader.IsDBNull(8) ? null : reader.GetString(8),
                reader.GetInt16(9));
        }

        return AuthResult.Success(
            await CreateSessionAsync(connection, transaction: null, user, cancellationToken));
    }

    public async Task<AuthResult> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken)
    {
        var tokenHash = tokenService.HashRefreshToken(request.RefreshToken);

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        // FOR UPDATE so two concurrent refreshes with the same token cannot both rotate it.
        const string selectSql = """
            SELECT t.user_id, t.expires_at, t.revoked_at,
                   u.email, u.role, u.is_active,
                   p.display_name, p.avatar_url, p.city, p.district, p.profile_completion
            FROM refresh_tokens t
            INNER JOIN users u ON u.id = t.user_id
            INNER JOIN profiles p ON p.user_id = t.user_id
            WHERE t.token_hash = @token_hash
            FOR UPDATE OF t
            """;

        await using var select = connection.CreateCommand();
        select.Transaction = transaction;
        select.CommandText = selectSql;
        select.AddParameter("token_hash", tokenHash);

        Guid userId;
        AuthenticatedUserDto user;
        await using (var reader = await select.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                return AuthResult.Failure(AuthError.InvalidRefreshToken);
            }

            userId = reader.GetGuid(0);
            var expiresAt = reader.GetFieldValue<DateTimeOffset>(1);
            var alreadyRevoked = !reader.IsDBNull(2);

            if (alreadyRevoked)
            {
                // A revoked token coming back means it was replayed or stolen. The holder of the
                // live token cannot be told apart from the attacker, so end every session.
                await reader.DisposeAsync();
                await RevokeAllForUserAsync(connection, transaction, userId, cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return AuthResult.Failure(AuthError.InvalidRefreshToken);
            }

            if (expiresAt <= DateTimeOffset.UtcNow)
            {
                return AuthResult.Failure(AuthError.InvalidRefreshToken);
            }

            if (!reader.GetBoolean(5))
            {
                return AuthResult.Failure(AuthError.AccountDisabled);
            }

            user = new AuthenticatedUserDto(
                userId,
                reader.GetString(3),
                reader.GetString(4),
                reader.GetString(6),
                reader.IsDBNull(7) ? null : reader.GetString(7),
                reader.GetString(8),
                reader.IsDBNull(9) ? null : reader.GetString(9),
                reader.GetInt16(10));
        }

        var session = await CreateSessionAsync(connection, transaction, user, cancellationToken);

        const string rotateSql = """
            UPDATE refresh_tokens
            SET revoked_at = now(), replaced_by_token_hash = @replacement_hash
            WHERE token_hash = @token_hash
            """;

        await using var rotate = connection.CreateCommand();
        rotate.Transaction = transaction;
        rotate.CommandText = rotateSql;
        rotate.AddParameter("token_hash", tokenHash);
        rotate.AddParameter("replacement_hash", tokenService.HashRefreshToken(session.RefreshToken));
        await rotate.ExecuteNonQueryAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return AuthResult.Success(session);
    }

    public async Task LogoutAsync(RefreshRequest request, CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE refresh_tokens
            SET revoked_at = now()
            WHERE token_hash = @token_hash AND revoked_at IS NULL
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("token_hash", tokenService.HashRefreshToken(request.RefreshToken));
        await command.ExecuteNonQueryAsync(cancellationToken);
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

    private async Task<AuthSessionDto> CreateSessionAsync(
        DbConnection connection,
        DbTransaction? transaction,
        AuthenticatedUserDto user,
        CancellationToken cancellationToken)
    {
        var accessToken = tokenService.CreateAccessToken(user.Id, user.Email, user.Role);
        var refreshToken = tokenService.CreateRefreshToken();

        const string sql = """
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
            VALUES (@user_id, @token_hash, @expires_at)
            """;

        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        command.AddParameter("user_id", user.Id);
        command.AddParameter("token_hash", refreshToken.Hash);
        command.AddParameter("expires_at", refreshToken.ExpiresAt);
        await command.ExecuteNonQueryAsync(cancellationToken);

        return new AuthSessionDto(
            accessToken.Value,
            "Bearer",
            accessToken.ExpiresAt,
            refreshToken.Value,
            refreshToken.ExpiresAt,
            user);
    }

    private static async Task RevokeAllForUserAsync(
        DbConnection connection,
        DbTransaction transaction,
        Guid userId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE refresh_tokens
            SET revoked_at = now()
            WHERE user_id = @user_id AND revoked_at IS NULL
            """;

        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        command.AddParameter("user_id", userId);
        await command.ExecuteNonQueryAsync(cancellationToken);
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
