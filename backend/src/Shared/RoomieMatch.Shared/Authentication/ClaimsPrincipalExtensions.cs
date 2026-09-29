using System.Security.Claims;

namespace RoomieMatch.Shared.Authentication;

public static class ClaimsPrincipalExtensions
{
    // The Users module disables MapInboundClaims, so the JWT "sub" claim keeps its original name.
    public const string UserIdClaimType = "sub";

    // users.token_version at issue time. A token whose value no longer matches the row
    // is rejected, which is how "log out everywhere" takes effect before expiry.
    public const string TokenVersionClaimType = "tv";

    public static Guid? GetUserId(this ClaimsPrincipal principal)
    {
        return Guid.TryParse(principal.FindFirst(UserIdClaimType)?.Value, out var userId)
            ? userId
            : null;
    }
}
