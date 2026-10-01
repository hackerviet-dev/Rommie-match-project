using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace RoomieMatch.Modules.Billing.Gateways;

// Signature formulas published at https://payos.vn/docs (cross-checked 2026-10-01 against
// "Kiểm tra dữ liệu với signature" and the API reference for "Tạo link thanh toán"):
//   * create payment link: HMAC_SHA256, key = checksum key, over
//     "amount=..&cancelUrl=..&description=..&orderCode=..&returnUrl=.."
//   * webhook / any data object: HMAC_SHA256 over every field sorted by name, "key=value"
//     joined with "&", null or missing rendered as an empty string.
// Both digests are lower-case hex. The implementation below reproduces the sample vector in
// the docs (checksum key 1a54..7675, webhook data orderCode 123 -> 412e915d..eaa03).
internal static class PayOsSignature
{
    public static string ForPaymentRequest(
        long orderCode,
        int amount,
        string description,
        string cancelUrl,
        string returnUrl,
        string checksumKey)
    {
        // payOS spells the fields out in this exact alphabetical order.
        var data = FormattableString.Invariant(
            $"amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}");

        return Hash(checksumKey, data);
    }

    // Signs an arbitrary JSON object the way payOS does for callbacks.
    public static string ForData(JsonElement data, string checksumKey)
    {
        var pairs = data.EnumerateObject()
            .OrderBy(property => property.Name, StringComparer.Ordinal)
            .Select(property => $"{property.Name}={ToSignatureValue(property.Value)}");

        return Hash(checksumKey, string.Join("&", pairs));
    }

    public static bool Matches(string expected, string actual)
    {
        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(expected),
            Encoding.ASCII.GetBytes(actual));
    }

    private static string Hash(string checksumKey, string data)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(checksumKey));
        return Convert.ToHexStringLower(hmac.ComputeHash(Encoding.UTF8.GetBytes(data)));
    }

    // JavaScript numbers turn into integers when they have no fraction, which is how payOS
    // sends amounts and order codes.
    private static string ToSignatureValue(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.String => element.GetString() ?? string.Empty,
        JsonValueKind.Number => element.TryGetInt64(out var value)
            ? value.ToString(CultureInfo.InvariantCulture)
            : element.GetDouble().ToString(CultureInfo.InvariantCulture),
        JsonValueKind.True => "true",
        JsonValueKind.False => "false",
        JsonValueKind.Null => string.Empty,
        _ => element.GetRawText()
    };
}
