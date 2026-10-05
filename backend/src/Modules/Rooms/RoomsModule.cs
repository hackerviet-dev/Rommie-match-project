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
        services.AddScoped<GeoService>();
        services.AddScoped<RoomPhotoService>();
        services.AddHttpClient("room-photos", c => c.Timeout = TimeSpan.FromSeconds(40));
        services.AddHttpClient("maps-geocoding", c => c.Timeout = TimeSpan.FromSeconds(12));
        services.AddHttpClient("maps-links", c => c.Timeout = TimeSpan.FromSeconds(8))
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
        return services;
    }
}
