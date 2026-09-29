using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Http;

namespace RoomieMatch.Bootstrapper.Infrastructure;

public sealed class CorsSettings
{
    public const string SectionName = "Cors";

    // Exact origins, e.g. "http://localhost:3100". Empty means no cross-origin caller is
    // allowed; the web app served through nginx is same-origin and does not need CORS.
    public string[] AllowedOrigins { get; set; } = [];
}

public sealed class RateLimitSettings
{
    public const string SectionName = "RateLimiting";

    public int CredentialsPermitLimit { get; set; } = 10;
    public int CredentialsWindowSeconds { get; set; } = 60;
    public int GlobalPermitLimit { get; set; } = 300;
    public int GlobalWindowSeconds { get; set; } = 60;
}

public sealed class ReverseProxySettings
{
    public const string SectionName = "ReverseProxy";

    // Only turn this on when every request reaches the API through a proxy that sets
    // X-Forwarded-For (nginx in docker-compose). If the API is also reachable directly,
    // a caller could forge the header to dodge per-IP limits.
    public bool TrustForwardedHeaders { get; set; }
}

public static class HttpHardeningExtensions
{
    public static IServiceCollection AddHttpHardening(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var cors = configuration.GetSection(CorsSettings.SectionName).Get<CorsSettings>() ?? new CorsSettings();
        // AllowCredentials because the SignalR browser client negotiates with credentials
        // on by default. Safe here: nothing authenticates by cookie, only by bearer token.
        services.AddCors(options => options.AddDefaultPolicy(policy =>
            policy.WithOrigins(cors.AllowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

        var proxy = configuration.GetSection(ReverseProxySettings.SectionName).Get<ReverseProxySettings>()
            ?? new ReverseProxySettings();
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = proxy.TrustForwardedHeaders
                ? ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
                : ForwardedHeaders.None;
            // The proxy's address is assigned by Docker and not known in advance. With a
            // single trusted hop, only the address nginx itself appended is used.
            options.KnownIPNetworks.Clear();
            options.KnownProxies.Clear();
            options.ForwardLimit = 1;
        });

        var limits = configuration.GetSection(RateLimitSettings.SectionName).Get<RateLimitSettings>()
            ?? new RateLimitSettings();
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = WriteRejectionAsync;

            // Per user when signed in (many students share one dorm or campus IP), per IP
            // otherwise.
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.User.GetUserId() is { } userId ? $"user:{userId}" : $"ip:{ClientIp(context)}",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = limits.GlobalPermitLimit,
                        Window = TimeSpan.FromSeconds(limits.GlobalWindowSeconds),
                        QueueLimit = 0
                    }));

            options.AddPolicy(RateLimitPolicies.Credentials, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    ClientIp(context),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = limits.CredentialsPermitLimit,
                        Window = TimeSpan.FromSeconds(limits.CredentialsWindowSeconds),
                        QueueLimit = 0
                    }));
        });

        return services;
    }

    private static string ClientIp(HttpContext context)
    {
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static async ValueTask WriteRejectionAsync(OnRejectedContext context, CancellationToken cancellationToken)
    {
        var response = context.HttpContext.Response;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds))
                .ToString(CultureInfo.InvariantCulture);
        }

        await response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Status = StatusCodes.Status429TooManyRequests,
                Title = "Too Many Requests",
                Detail = "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút."
            },
            options: null,
            contentType: "application/problem+json",
            cancellationToken);
    }
}
