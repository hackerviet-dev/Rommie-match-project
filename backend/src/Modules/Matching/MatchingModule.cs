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
    // Needs an IPremiumStatus, which the Billing module registers.
    public static IServiceCollection AddMatchingModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<MatchingOptions>(configuration.GetSection(MatchingOptions.SectionName));
        services.AddScoped<IMatchingService, MatchingService>();
        services.AddScoped<IQuizService, QuizService>();
        services.AddScoped<IMatchRequestService, MatchRequestService>();
        return services;
    }
}
