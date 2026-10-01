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
        // payOS is reached over HTTP, so it gets a named client. Registered once and shared by
        // both interfaces it implements.
        services.AddHttpClient(PayOsPaymentGateway.HttpClientName);
        services.AddSingleton<PayOsPaymentGateway>();
        services.AddSingleton<IPaymentGateway>(provider => provider.GetRequiredService<PayOsPaymentGateway>());
        services.AddSingleton<IPaymentWebhookGateway>(provider => provider.GetRequiredService<PayOsPaymentGateway>());
        services.AddScoped<IBillingService, BillingService>();
        services.AddScoped<IPremiumStatus, PremiumStatus>();
        return services;
    }
}
