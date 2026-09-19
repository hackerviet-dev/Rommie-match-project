using Microsoft.AspNetCore.Identity;

namespace RoomieMatch.Modules.Users.Authentication;

public sealed class PasswordHashService
{
    // PasswordHasher<T> ignores its user argument entirely, so the type parameter is irrelevant.
    private static readonly PasswordHasher<object> Hasher = new();

    public string Hash(string password)
    {
        return Hasher.HashPassword(this, password);
    }

    public bool Verify(string hashedPassword, string providedPassword)
    {
        return Hasher.VerifyHashedPassword(this, hashedPassword, providedPassword)
            is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
    }
}
