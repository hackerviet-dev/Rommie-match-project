using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RoomieMatch.Modules.Billing.Gateways;
using RoomieMatch.Modules.Billing.Services;
using RoomieMatch.Shared.Contracts;

namespace RoomieMatch.Modules.Billing;

public sealed class BillingModule : IModule
{
    public string Name => "Billing";
}

public static class BillingModuleExtensions
{
    public static IServiceCollection AddBillingModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<BillingOptions>(configuration.GetSection(BillingOptions.SectionName));
        services.AddSingleton<IPaymentGateway, MockPaymentGateway>();
        services.AddScoped<IBillingService, BillingService>();
        return services;
    }
}
