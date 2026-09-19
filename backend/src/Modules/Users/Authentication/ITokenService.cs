namespace RoomieMatch.Modules.Users.Authentication;

public interface ITokenService
{
    AccessToken CreateAccessToken(Guid userId, string email, string role);
}

public sealed record AccessToken(string Value, DateTimeOffset ExpiresAt);
