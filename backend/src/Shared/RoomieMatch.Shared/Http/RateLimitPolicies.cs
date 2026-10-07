namespace RoomieMatch.Shared.Http;

// Policy names shared between the Bootstrapper, which defines the limits, and the
// modules, which opt endpoints into them with [EnableRateLimiting].
public static class RateLimitPolicies
{
    // Credential endpoints (login, register, refresh): tight per-IP limit against
    // password guessing and account-creation floods.
    public const string Credentials = "credentials";

    // File uploads: each one is a paid round trip to Cloudinary, so they get their own
    // per-user budget on top of the global limit.
    public const string Uploads = "uploads";
}
