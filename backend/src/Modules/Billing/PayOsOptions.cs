namespace RoomieMatch.Modules.Billing;

// payOS merchant credentials. Deliberately empty in the repo: fill them in through
// configuration or the Billing__PayOs__* environment variables, never in appsettings.
public sealed class PayOsOptions
{
    public string ClientId { get; set; } = string.Empty;

    public string ApiKey { get; set; } = string.Empty;

    public string ChecksumKey { get; set; } = string.Empty;

    // Sandbox and production share this host; the channel behind the credentials decides which
    // environment the payment lands in.
    public string ApiBaseUrl { get; set; } = "https://api-merchant.payos.vn";
}
