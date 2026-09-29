using System.Globalization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Users.Authentication;

// Runs after signature and lifetime checks pass. One primary-key read per authenticated
// request is the price of revocation that works immediately and across every API
// instance, with no shared cache to keep in sync.
internal static class TokenVersionValidator
{
    public static async Task ValidateAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;
        if (principal?.GetUserId() is not { } userId
            || !int.TryParse(
                principal.FindFirst(ClaimsPrincipalExtensions.TokenVersionClaimType)?.Value,
                NumberStyles.Integer,
                CultureInfo.InvariantCulture,
                out var tokenVersion))
        {
            // Tokens issued before token_version existed carry no claim; they are
            // treated as revoked rather than trusted.
            context.Fail("Access token is missing its version.");
            return;
        }

        const string sql = "SELECT token_version FROM users WHERE id = @user_id AND is_active = true";

        var connectionFactory = context.HttpContext.RequestServices.GetRequiredService<IDbConnectionFactory>();
        var cancellationToken = context.HttpContext.RequestAborted;
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("user_id", userId);

        if (await command.ExecuteScalarAsync(cancellationToken) is not int currentVersion
            || currentVersion != tokenVersion)
        {
            context.Fail("Access token has been revoked.");
        }
    }
}
