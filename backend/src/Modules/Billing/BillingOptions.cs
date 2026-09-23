namespace RoomieMatch.Modules.Billing;

public sealed class BillingOptions
{
    public const string SectionName = "Billing";

    // Empty means no gateway is configured and checkout is refused. The mock gateway
    // marks payments as paid without taking money, so it must be opted into explicitly.
    public string Provider { get; set; } = string.Empty;

    // Where the gateway sends the user's browser after paying. Fixed in config rather than
    // taken from the request so checkout cannot be turned into an open redirect.
    public string ReturnUrl { get; set; } = "http://localhost:3100/premium/result";

    public string PublicApiBaseUrl { get; set; } = "http://localhost:5000";

    public int PaymentTimeoutMinutes { get; set; } = 15;
}
