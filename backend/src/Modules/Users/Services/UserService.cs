namespace RoomieMatch.Modules.Users.Services;

public sealed class UserService : IUserService
{
    public object GetModuleStatus()
    {
        return new
        {
            module = "Users",
            features = new[] { "auth", "profiles", "roles" }
        };
    }
}
