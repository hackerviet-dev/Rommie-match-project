namespace RoomieMatch.Modules.Media;

// Cloudinary account credentials. Deliberately empty in the repo: fill them in through the
// Cloudinary__* environment variables, or paste the dashboard's "API environment variable"
// (cloudinary://<api_key>:<api_secret>@<cloud_name>) into Cloudinary__Url or CLOUDINARY_URL.
public sealed class CloudinaryOptions
{
    public const string SectionName = "Cloudinary";

    public string Url { get; set; } = string.Empty;

    public string CloudName { get; set; } = string.Empty;

    public string ApiKey { get; set; } = string.Empty;

    public string ApiSecret { get; set; } = string.Empty;

    // Root folder in the Media Library; uploads go to <Folder>/<purpose>/<user id>/.
    public string Folder { get; set; } = "roomiematch";

    public string ApiBaseUrl { get; set; } = "https://api.cloudinary.com";

    public bool IsConfigured =>
        CloudName.Length > 0 && ApiKey.Length > 0 && ApiSecret.Length > 0;

    // Fills CloudName/ApiKey/ApiSecret from a cloudinary:// URL where they are not set.
    public void ApplyUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return;
        }

        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri)
            || uri.Scheme != "cloudinary"
            || uri.UserInfo.Split(':', 2) is not [{ Length: > 0 } key, { Length: > 0 } secret]
            || uri.Host.Length == 0)
        {
            throw new InvalidOperationException(
                "Cloudinary URL must look like cloudinary://<api_key>:<api_secret>@<cloud_name>.");
        }

        if (CloudName.Length == 0) CloudName = uri.Host;
        if (ApiKey.Length == 0) ApiKey = Uri.UnescapeDataString(key);
        if (ApiSecret.Length == 0) ApiSecret = Uri.UnescapeDataString(secret);
    }
}
