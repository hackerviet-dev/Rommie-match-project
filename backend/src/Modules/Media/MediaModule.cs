using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RoomieMatch.Modules.Media.Services;
using RoomieMatch.Shared.Contracts;

namespace RoomieMatch.Modules.Media;

public sealed class MediaModule : IModule
{
    public string Name => "Media";
}

public static class MediaModuleExtensions
{
    public static IServiceCollection AddMediaModule(this IServiceCollection services, IConfiguration configuration)
    {
        var cloudinary = configuration.GetSection(CloudinaryOptions.SectionName).Get<CloudinaryOptions>()
            ?? new CloudinaryOptions();
        // CLOUDINARY_URL is the name Cloudinary's own dashboard and SDKs use.
        cloudinary.ApplyUrl(string.IsNullOrWhiteSpace(cloudinary.Url) ? configuration["CLOUDINARY_URL"] : cloudinary.Url);
        cloudinary.Folder = cloudinary.Folder.Trim('/');
        if (cloudinary.Folder.Length == 0)
        {
            throw new InvalidOperationException("Cloudinary:Folder must not be empty.");
        }

        if (!Uri.TryCreate(cloudinary.ApiBaseUrl, UriKind.Absolute, out var apiUrl) || apiUrl.Scheme != "https")
        {
            throw new InvalidOperationException("Cloudinary:ApiBaseUrl must be an HTTPS URL.");
        }

        // Missing credentials do not stop the API: uploads answer 503 until they are set.
        services.AddSingleton(cloudinary);
        services.AddHttpClient(CloudinaryImageService.HttpClientName, client => client.Timeout = TimeSpan.FromSeconds(60));
        services.AddSingleton<CloudinaryImageService>();
        services.AddSingleton<IImageUploadService>(provider => provider.GetRequiredService<CloudinaryImageService>());
        services.AddSingleton<IUploadedImageVerifier>(provider => provider.GetRequiredService<CloudinaryImageService>());
        return services;
    }
}
