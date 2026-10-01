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
        var billing = configuration.GetSection(BillingOptions.SectionName).Get<BillingOptions>() ?? new BillingOptions();
        if (billing.Provider is not ("" or "mock" or "payos"))
        {
            throw new InvalidOperationException("Billing:Provider must be empty, mock, or payos.");
        }

        if (billing.Provider == PayOsPaymentGateway.ProviderName)
        {
            if (string.IsNullOrWhiteSpace(billing.PayOs.ClientId)
                || string.IsNullOrWhiteSpace(billing.PayOs.ApiKey)
                || string.IsNullOrWhiteSpace(billing.PayOs.ChecksumKey))
            {
                throw new InvalidOperationException(
                    "payOS requires Billing:PayOs:ClientId, ApiKey, and ChecksumKey environment values.");
            }

            if (!Uri.TryCreate(billing.ReturnUrl, UriKind.Absolute, out var returnUrl)
                || returnUrl.Scheme is not ("http" or "https")
                || !Uri.TryCreate(billing.PayOs.ApiBaseUrl, UriKind.Absolute, out var apiUrl)
                || apiUrl.Scheme != "https")
            {
                throw new InvalidOperationException("payOS requires a valid return URL and HTTPS API base URL.");
            }
        }

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
