namespace RoomieMatch.Modules.Users.Authentication;

public interface ITokenService
{
    AccessToken CreateAccessToken(Guid userId, string email, string role);
    RefreshToken CreateRefreshToken();
    string HashRefreshToken(string value);
}

public sealed record AccessToken(string Value, DateTimeOffset ExpiresAt);

public sealed record RefreshToken(string Value, string Hash, DateTimeOffset ExpiresAt);
