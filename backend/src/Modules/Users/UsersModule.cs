using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Contracts;

namespace RoomieMatch.Modules.Users;

public sealed class UsersModule : IModule
{
    public string Name => "Users";
}

public static class UsersModuleExtensions
{
    public static IServiceCollection AddUsersModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IUserService, UserService>();
        return services;
    }
}
