using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;

namespace RoomieMatch.Modules.Rooms.Services;

public sealed record GeoLocation(string Address, string District, string City, double Latitude, double Longitude, string? PlaceId);
public sealed class GeoException(int status, string message) : Exception(message) { public int Status { get; } = status; }

public sealed class GeoService(IHttpClientFactory clients, IConfiguration config)
{
    public async Task<GeoLocation> Reverse(double latitude, double longitude, CancellationToken ct)
    {
        if (!double.IsFinite(latitude) || !double.IsFinite(longitude) || Math.Abs(latitude) > 90 || Math.Abs(longitude) > 180)
            throw new GeoException(400, "Tọa độ không hợp lệ.");
        return await Geocode("latlng", FormattableString.Invariant($"{latitude},{longitude}"), ct);
    }

    public async Task<GeoLocation> ResolveLink(string link, CancellationToken ct)
    {
        if (link.Length > 4096 || !Uri.TryCreate(link, UriKind.Absolute, out var uri) || !IsMapsUrl(uri))
            throw new GeoException(400, "Hãy dán link HTTPS Google Maps hợp lệ.");
        // Only Google's two short-link hosts are fetched. Never follow redirects automatically.
        var client = clients.CreateClient("maps-links");
        for (var i = 0; IsShort(uri) && i < 4; i++)
        {
            using var response = await client.SendAsync(new HttpRequestMessage(HttpMethod.Get, uri), HttpCompletionOption.ResponseHeadersRead, ct);
            if ((int)response.StatusCode is < 300 or >= 400 || response.Headers.Location is not { } target)
                throw new GeoException(422, "Không mở được link rút gọn. Hãy mở Google Maps và sao chép link đầy đủ.");
            uri = target.IsAbsoluteUri ? target : new Uri(uri, target);
            if (!IsMapsUrl(uri)) throw new GeoException(400, "Link chuyển đến trang không được hỗ trợ.");
        }
        if (IsShort(uri)) throw new GeoException(422, "Link chuyển hướng quá nhiều lần. Hãy dùng link Google Maps đầy đủ.");
        var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query);
        if (query.TryGetValue("query_place_id", out var place) && !string.IsNullOrWhiteSpace(place))
            return await Geocode("place_id", place.ToString(), ct);
        var data = Uri.UnescapeDataString(uri.PathAndQuery);
        // !3d/!4d denote a selected place; @ denotes camera center, deliberately ignored.
        var point = Regex.Match(data, @"!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)");
        if (point.Success) return await Reverse(double.Parse(point.Groups[1].Value, CultureInfo.InvariantCulture), double.Parse(point.Groups[2].Value, CultureInfo.InvariantCulture), ct);
        foreach (var key in new[] { "query", "q" })
        {
            if (!query.TryGetValue(key, out var raw) || string.IsNullOrWhiteSpace(raw)) continue;
            var value = raw.ToString();
            if (value.StartsWith("place_id:", StringComparison.Ordinal)) return await Geocode("place_id", value[9..], ct);
            var coords = Regex.Match(value, @"^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$");
            if (coords.Success) return await Reverse(double.Parse(coords.Groups[1].Value, CultureInfo.InvariantCulture), double.Parse(coords.Groups[2].Value, CultureInfo.InvariantCulture), ct);
            return await Geocode("address", value, ct);
        }
        var address = Regex.Match(uri.AbsolutePath, @"/maps/(?:place|search)/([^/]+)");
        if (address.Success) return await Geocode("address", Uri.UnescapeDataString(address.Groups[1].Value.Replace('+', ' ')), ct);
        throw new GeoException(422, "Link chỉ có tâm bản đồ, chưa có điểm phòng. Hãy chia sẻ một địa điểm hoặc dùng tìm địa chỉ.");
    }

    public static bool IsMapsUrl(Uri uri) => uri.Scheme == "https" && uri.IsDefaultPort && string.IsNullOrEmpty(uri.UserInfo)
        && ((uri.Host is "www.google.com" or "google.com" or "www.google.com.vn" or "google.com.vn") && uri.AbsolutePath.StartsWith("/maps", StringComparison.Ordinal)
            || uri.Host == "maps.google.com" || uri.Host == "maps.app.goo.gl" || uri.Host == "goo.gl" && uri.AbsolutePath.StartsWith("/maps/", StringComparison.Ordinal));
    private static bool IsShort(Uri uri) => uri.Host is "maps.app.goo.gl" or "goo.gl";

    private async Task<GeoLocation> Geocode(string field, string value, CancellationToken ct)
    {
        var key = config["Maps:ServerApiKey"];
        if (string.IsNullOrWhiteSpace(key)) throw new GeoException(503, "Google Maps chưa được cấu hình. Bạn vẫn có thể nhập địa chỉ thủ công.");
        using var response = await clients.CreateClient("maps-geocoding").GetAsync($"https://maps.googleapis.com/maps/api/geocode/json?{field}={Uri.EscapeDataString(value)}&language=vi&key={Uri.EscapeDataString(key)}", ct);
        if (!response.IsSuccessStatusCode) throw new GeoException(502, "Google Maps đang không phản hồi. Vui lòng thử lại.");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(ct));
        var root = json.RootElement;
        var status = root.GetProperty("status").GetString();
        if (status == "ZERO_RESULTS") throw new GeoException(422, "Không tìm thấy địa chỉ. Hãy tìm địa điểm gần phòng rồi kéo ghim.");
        if (status != "OK") throw new GeoException(502, "Không tra cứu được địa chỉ Google Maps. Vui lòng thử lại hoặc nhập thủ công.");
        var result = root.GetProperty("results")[0];
        var components = result.GetProperty("address_components").EnumerateArray().ToArray();
        string Component(params string[] types) => types.Select(type => components.FirstOrDefault(c => c.GetProperty("types").EnumerateArray().Any(t => t.GetString() == type)))
            .Where(c => c.ValueKind != JsonValueKind.Undefined).Select(c => c.GetProperty("long_name").GetString()!).FirstOrDefault() ?? "";
        var position = result.GetProperty("geometry").GetProperty("location");
        return new(result.GetProperty("formatted_address").GetString()!, Component("administrative_area_level_2", "sublocality_level_1", "locality"),
            Component("administrative_area_level_1", "locality"), position.GetProperty("lat").GetDouble(), position.GetProperty("lng").GetDouble(), result.GetProperty("place_id").GetString());
    }
}
