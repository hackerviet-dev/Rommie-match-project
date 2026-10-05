using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace RoomieMatch.Modules.Users.Authentication;

public sealed record GoogleIdentity(string Subject, string Email, string Name, string? Picture);

public sealed class GoogleIdentityValidator(IConfiguration configuration)
{
    public string ClientId => configuration["Google:ClientId"]?.Trim() ?? "";
    private readonly ConfigurationManager<OpenIdConnectConfiguration> metadata = new(
        "https://accounts.google.com/.well-known/openid-configuration",
        new OpenIdConnectConfigurationRetriever());

    public async Task<GoogleIdentity?> ValidateAsync(string credential, CancellationToken cancellationToken)
    {
        var keys = await metadata.GetConfigurationAsync(cancellationToken);
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuers = ["accounts.google.com", "https://accounts.google.com"],
            ValidateAudience = true, ValidAudience = ClientId,
            ValidateLifetime = true, RequireExpirationTime = true,
            RequireSignedTokens = true, ValidateIssuerSigningKey = true,
            IssuerSigningKeys = keys.SigningKeys, ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        var result = await new JsonWebTokenHandler().ValidateTokenAsync(credential, parameters);
        if (!result.IsValid && result.Exception is SecurityTokenSignatureKeyNotFoundException)
        {
            metadata.RequestRefresh();
            keys = await metadata.GetConfigurationAsync(cancellationToken);
            parameters.IssuerSigningKeys = keys.SigningKeys;
            result = await new JsonWebTokenHandler().ValidateTokenAsync(credential, parameters);
        }
        if (!result.IsValid) return null;
        var claims = result.ClaimsIdentity;
        var subject = claims.FindFirst("sub")?.Value;
        var email = claims.FindFirst("email")?.Value;
        if (string.IsNullOrWhiteSpace(subject) || subject.Length > 255 ||
            string.IsNullOrWhiteSpace(email) || email.Length > 320 || !new EmailAddressAttribute().IsValid(email) ||
            !string.Equals(claims.FindFirst("email_verified")?.Value, "true", StringComparison.OrdinalIgnoreCase)) return null;
        var name = claims.FindFirst("name")?.Value?.Trim();
        if (string.IsNullOrWhiteSpace(name)) name = email.Split('@')[0];
        if (name.Length > 120) name = name[..120];
        var picture = claims.FindFirst("picture")?.Value;
        if (!Uri.TryCreate(picture, UriKind.Absolute, out var uri) || uri.Scheme != "https") picture = null;
        return new GoogleIdentity(subject, email.Trim().ToLowerInvariant(), name, picture);
    }
}
