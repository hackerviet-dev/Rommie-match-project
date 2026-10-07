using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using RoomieMatch.Shared.Contracts;

namespace RoomieMatch.Modules.Media.Services;

// Uploads go through the API rather than straight from the browser to Cloudinary, so the API
// secret never leaves the server and the file type and size are checked on our side.
public sealed class CloudinaryImageService(
    IHttpClientFactory httpClientFactory,
    CloudinaryOptions options,
    ILogger<CloudinaryImageService> logger) : IImageUploadService, IUploadedImageVerifier
{
    public const string HttpClientName = "cloudinary";

    private static readonly string IncomingTransformation =
        $"c_limit,h_{MediaRules.MaxImageDimension},w_{MediaRules.MaxImageDimension}";

    // Built once: the cloud and folder do not change while the process runs.
    private readonly Regex? ownUploadPattern = options.IsConfigured
        ? new Regex(
            $"^https://res\\.cloudinary\\.com/{Regex.Escape(options.CloudName)}/image/upload/v[0-9]+/"
            + $"{Regex.Escape(options.Folder)}/(?<purpose>[a-z]+)/(?<user>[0-9a-f-]{{36}})/[A-Za-z0-9_-]+\\.(jpg|png|webp)$",
            RegexOptions.CultureInvariant)
        : null;

    public object GetModuleStatus()
    {
        return new
        {
            module = "Media",
            configured = options.IsConfigured,
            maxImageBytes = MediaRules.MaxImageBytes,
            formats = new[] { "jpg", "png", "webp" }
        };
    }

    public async Task<MediaResult<UploadedImageDto>> UploadAsync(
        Guid userId,
        ImagePurpose purpose,
        Stream content,
        long length,
        CancellationToken cancellationToken)
    {
        if (length > MediaRules.MaxImageBytes)
        {
            return MediaResult<UploadedImageDto>.Failure(MediaError.TooLarge);
        }

        // Held in memory (5 MB at most) so the header can be sniffed and the same bytes sent on.
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, cancellationToken);
        if (buffer.Length > MediaRules.MaxImageBytes)
        {
            return MediaResult<UploadedImageDto>.Failure(MediaError.TooLarge);
        }

        // The declared content type and file name come from the client, so only the bytes count.
        if (SniffFormat(buffer.GetBuffer().AsSpan(0, (int)buffer.Length)) is not { } format)
        {
            return MediaResult<UploadedImageDto>.Failure(MediaError.InvalidFile);
        }

        // Checked after the file itself, so a bad file gets the same answer with or without storage.
        if (!options.IsConfigured)
        {
            return MediaResult<UploadedImageDto>.Failure(MediaError.NotConfigured);
        }

        var parameters = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["folder"] = $"{options.Folder}/{FolderName(purpose)}/{userId}",
            ["timestamp"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture),
            ["transformation"] = IncomingTransformation
        };

        using var form = new MultipartFormDataContent();
        foreach (var (key, value) in parameters)
        {
            form.Add(new StringContent(value), key);
        }

        form.Add(new StringContent(options.ApiKey), "api_key");
        form.Add(new StringContent(Sign(parameters, options.ApiSecret)), "signature");
        buffer.Position = 0;
        var file = new StreamContent(buffer);
        file.Headers.ContentType = new MediaTypeHeaderValue(format.MimeType);
        form.Add(file, "file", $"upload.{format.Extension}");

        var client = httpClientFactory.CreateClient(HttpClientName);
        var endpoint = $"{options.ApiBaseUrl.TrimEnd('/')}/v1_1/{Uri.EscapeDataString(options.CloudName)}/image/upload";
        try
        {
            using var response = await client.PostAsync(endpoint, form, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                // Cloudinary's message names the problem (bad credentials, quota) without echoing them.
                logger.LogWarning(
                    "Cloudinary upload failed with {Status}: {Body}",
                    (int)response.StatusCode,
                    await response.Content.ReadAsStringAsync(cancellationToken));
                return MediaResult<UploadedImageDto>.Failure(MediaError.UploadFailed);
            }

            var uploaded = await response.Content.ReadFromJsonAsync<CloudinaryUploadResponse>(cancellationToken);
            if (uploaded?.SecureUrl is not { Length: > 0 } url || uploaded.PublicId is not { Length: > 0 } publicId)
            {
                return MediaResult<UploadedImageDto>.Failure(MediaError.UploadFailed);
            }

            return MediaResult<UploadedImageDto>.Success(new UploadedImageDto(
                url, publicId, uploaded.Width, uploaded.Height, uploaded.Bytes, uploaded.Format ?? format.Extension));
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning(exception, "Cloudinary upload request failed.");
            return MediaResult<UploadedImageDto>.Failure(MediaError.UploadFailed);
        }
    }

    public bool IsUploadedBy(string url, Guid userId, ImagePurpose purpose)
    {
        if (ownUploadPattern?.Match(url) is not { Success: true } match)
        {
            return false;
        }

        return match.Groups["purpose"].Value == FolderName(purpose)
            && match.Groups["user"].Value == userId.ToString();
    }

    // Cloudinary's signature: the signed parameters as sorted "key=value" pairs joined by '&',
    // followed by the API secret, hashed with SHA-1.
    internal static string Sign(IEnumerable<KeyValuePair<string, string>> parameters, string apiSecret)
    {
        var payload = string.Join('&', parameters.Select(pair => $"{pair.Key}={pair.Value}")) + apiSecret;
        return Convert.ToHexStringLower(SHA1.HashData(Encoding.UTF8.GetBytes(payload)));
    }

    private static string FolderName(ImagePurpose purpose)
    {
        return purpose switch
        {
            ImagePurpose.Avatar => "avatars",
            ImagePurpose.Chat => "chat",
            ImagePurpose.Verification => "verifications",
            _ => throw new ArgumentOutOfRangeException(nameof(purpose), purpose, null)
        };
    }

    private static ImageFormat? SniffFormat(ReadOnlySpan<byte> bytes)
    {
        if (bytes.StartsWith((ReadOnlySpan<byte>)[0xFF, 0xD8, 0xFF]))
        {
            return new ImageFormat("jpg", "image/jpeg");
        }

        if (bytes.StartsWith((ReadOnlySpan<byte>)[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
        {
            return new ImageFormat("png", "image/png");
        }

        if (bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8))
        {
            return new ImageFormat("webp", "image/webp");
        }

        return null;
    }

    private sealed record ImageFormat(string Extension, string MimeType);

    private sealed record CloudinaryUploadResponse(
        [property: JsonPropertyName("secure_url")] string? SecureUrl,
        [property: JsonPropertyName("public_id")] string? PublicId,
        [property: JsonPropertyName("width")] int Width,
        [property: JsonPropertyName("height")] int Height,
        [property: JsonPropertyName("bytes")] long Bytes,
        [property: JsonPropertyName("format")] string? Format);
}
