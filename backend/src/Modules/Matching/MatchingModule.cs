using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RoomieMatch.Modules.Matching.Services;
using RoomieMatch.Shared.Contracts;

namespace RoomieMatch.Modules.Matching;

public sealed class MatchingModule : IModule
{
    public string Name => "Matching";
}

public static class MatchingModuleExtensions
{
    public static IServiceCollection AddMatchingModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IMatchingService, MatchingService>();
        return services;
    }
}
