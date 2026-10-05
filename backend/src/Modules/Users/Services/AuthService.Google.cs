using RoomieMatch.Shared.Data;
using RoomieMatch.Modules.Users.Authentication;

namespace RoomieMatch.Modules.Users.Services;

public sealed partial class AuthService
{
    public async Task<AuthResult> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(googleIdentityValidator.ClientId)) return AuthResult.Failure(AuthError.GoogleUnavailable);
        GoogleIdentity? identity;
        try { identity = await googleIdentityValidator.ValidateAsync(request.Credential, cancellationToken); }
        catch (HttpRequestException) { return AuthResult.Failure(AuthError.GoogleUnavailable); }
        catch (InvalidOperationException) { return AuthResult.Failure(AuthError.GoogleUnavailable); }
        if (identity is null) return AuthResult.Failure(AuthError.InvalidGoogleToken);

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        // Serialize simultaneous first sign-ins/linking for the same Google identity.
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "SELECT pg_advisory_xact_lock(hashtextextended(@subject, 0))";
        command.AddParameter("subject", identity.Subject);
        await command.ExecuteNonQueryAsync(cancellationToken);
        command.CommandText = """
            SELECT u.id, u.email, u.role, u.password_hash, u.is_active, u.google_subject,
                   p.display_name, p.avatar_url, p.city, p.district, p.profile_completion, u.token_version
            FROM users u JOIN profiles p ON p.user_id = u.id
            WHERE u.google_subject = @subject OR u.email = @email
            ORDER BY CASE WHEN u.google_subject = @subject THEN 0 ELSE 1 END
            LIMIT 1 FOR UPDATE OF u
            """;
        command.AddParameter("email", identity.Email);
        AuthenticatedUserDto? user = null;
        var tokenVersion = 0;
        var needsLink = false;
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            if (await reader.ReadAsync(cancellationToken))
            {
                if (!reader.GetBoolean(4)) return AuthResult.Failure(AuthError.AccountDisabled);
                if (reader.IsDBNull(5) || reader.GetString(5) != identity.Subject)
                {
                    // Never merge accounts just because their email strings match.
                    if (!reader.IsDBNull(5)) return AuthResult.Failure(AuthError.GoogleLinkRequired);
                    if (reader.IsDBNull(3) || string.IsNullOrEmpty(request.PasswordToLink)) return AuthResult.Failure(AuthError.GoogleLinkRequired);
                    if (!passwordHashService.Verify(reader.GetString(3), request.PasswordToLink)) return AuthResult.Failure(AuthError.InvalidCredentials);
                    needsLink = true;
                }
                user = new AuthenticatedUserDto(reader.GetGuid(0),reader.GetString(1),reader.GetString(2),reader.GetString(6),
                    reader.IsDBNull(7) ? null : reader.GetString(7),reader.GetString(8),reader.IsDBNull(9) ? null : reader.GetString(9),reader.GetInt16(10));
                tokenVersion = reader.GetInt32(11);
            }
        }
        if (needsLink)
        {
            command.CommandText = "UPDATE users SET google_subject = @subject, updated_at = now() WHERE id = @id";
            command.AddParameter("id", user!.Id);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        if (user is null)
        {
            command.CommandText = "INSERT INTO users (email, auth_provider, google_subject) VALUES (@email, 'google', @subject) ON CONFLICT DO NOTHING RETURNING id";
            if (await command.ExecuteScalarAsync(cancellationToken) is not Guid id) return AuthResult.Failure(AuthError.GoogleLinkRequired);
            var avatar = identity.Picture ?? BuildAvatarUrl(identity.Name);
            command.CommandText = "INSERT INTO profiles (user_id, display_name, city, avatar_url, profile_completion) VALUES (@id, @name, '', @avatar, 0)";
            command.AddParameter("id", id).AddParameter("name", identity.Name).AddParameter("avatar", avatar);
            await command.ExecuteNonQueryAsync(cancellationToken);
            user = new AuthenticatedUserDto(id,identity.Email,"member",identity.Name,avatar,"",null,0);
        }
        var session = await CreateSessionAsync(connection, transaction, user, tokenVersion, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return AuthResult.Success(session);
    }
}
