using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RoomieMatch.Modules.Hyperlocal.Services;
using RoomieMatch.Shared.Contracts;

namespace RoomieMatch.Modules.Hyperlocal;

public sealed class HyperlocalModule : IModule
{
    public string Name => "Hyperlocal";
}

public static class HyperlocalModuleExtensions
{
    public static IServiceCollection AddHyperlocalModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IHyperlocalService, HyperlocalService>();
        return services;
    }
}
