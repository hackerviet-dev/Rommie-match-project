using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RoomieMatch.Modules.Rooms.Services;
using RoomieMatch.Shared.Contracts;

namespace RoomieMatch.Modules.Rooms;

public sealed class RoomsModule : IModule
{
    public string Name => "Rooms";
}

public static class RoomsModuleExtensions
{
    public static IServiceCollection AddRoomsModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IRoomService, RoomService>();
        return services;
    }
}
