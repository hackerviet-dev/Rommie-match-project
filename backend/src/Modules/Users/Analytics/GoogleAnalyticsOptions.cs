using System.Text;
using System.Text.Json;

namespace RoomieMatch.Modules.Users.Analytics;

// Read access to the RoomieMatch GA4 property for the staff dashboard. The service account key
// is deliberately empty in the repo: create a key in Google Cloud, add the service account's
// email as a Viewer on the GA4 property, then paste the downloaded JSON (or its base64) into
// GoogleAnalytics__ServiceAccountJson.
public sealed class GoogleAnalyticsOptions
{
    public const string SectionName = "GoogleAnalytics";

    // Numeric property id from the GA4 admin URL (…/a409108259p559419688/…), not the G- tag.
    public string PropertyId { get; set; } = "559419688";

    public string ServiceAccountJson { get; set; } = string.Empty;

    public string DataApiBaseUrl { get; set; } = "https://analyticsdata.googleapis.com";

    // Taken from the key file when it names one; set here only to point tests at a fake.
    public string TokenUri { get; set; } = string.Empty;

    public string ClientEmail { get; private set; } = string.Empty;

    public string PrivateKey { get; private set; } = string.Empty;

    public bool IsConfigured =>
        PropertyId.Length > 0 && ClientEmail.Length > 0 && PrivateKey.Length > 0;

    // Fills ClientEmail/PrivateKey/TokenUri from the key file; raw JSON or base64 of it.
    public void ApplyServiceAccountJson()
    {
        var raw = ServiceAccountJson.Trim();
        if (raw.Length == 0)
        {
            return;
        }

        if (!raw.StartsWith('{'))
        {
            try
            {
                raw = Encoding.UTF8.GetString(Convert.FromBase64String(raw));
            }
            catch (FormatException)
            {
                throw new InvalidOperationException(
                    "GoogleAnalytics:ServiceAccountJson must be the service account key JSON or its base64.");
            }
        }

        try
        {
            using var document = JsonDocument.Parse(raw);
            var root = document.RootElement;
            ClientEmail = root.TryGetProperty("client_email", out var email) ? email.GetString() ?? "" : "";
            PrivateKey = root.TryGetProperty("private_key", out var key) ? key.GetString() ?? "" : "";
            if (TokenUri.Length == 0 && root.TryGetProperty("token_uri", out var tokenUri))
            {
                TokenUri = tokenUri.GetString() ?? "";
            }
        }
        catch (JsonException)
        {
            throw new InvalidOperationException("GoogleAnalytics:ServiceAccountJson is not valid JSON.");
        }

        if (ClientEmail.Length == 0 || PrivateKey.Length == 0)
        {
            throw new InvalidOperationException(
                "GoogleAnalytics:ServiceAccountJson must contain client_email and private_key.");
        }
    }
}
