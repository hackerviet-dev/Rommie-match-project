using System.Text.Json;
using System.Text.RegularExpressions;

namespace RoomieMatch.Modules.Rooms.Services;

internal static class RoomLocations
{
    private static readonly Dictionary<string, HashSet<string>> Provinces = Load();

    private static string Normalize(string value)
    {
        var name = value.Trim().ToLowerInvariant();
        if (name is "tp.hcm" or "tphcm" or "tp. hcm" or "hcm") return "hồ chí minh";
        return Regex.Replace(Regex.Replace(name, @"^(thành phố|tỉnh|tp\.?)[\s.]*", ""), @"\s+", " ");
    }

    public static bool IsProvince(string? city) => city is not null && Provinces.ContainsKey(Normalize(city));
    public static bool IsArea(string? city, string? area) => city is not null && area is not null
        && Provinces.TryGetValue(Normalize(city), out var areas) && areas.Contains(area.Trim());

    private static Dictionary<string, HashSet<string>> Load()
    {
        using var stream = typeof(RoomLocations).Assembly.GetManifestResourceStream("RoomieMatch.RoomLocations")!;
        using var doc = JsonDocument.Parse(stream);
        return doc.RootElement.GetProperty("provinces").EnumerateArray().ToDictionary(
            p => Normalize(p.GetProperty("name").GetString()!),
            p => p.GetProperty("areas").EnumerateArray().Select(a => a.GetString()!).ToHashSet(StringComparer.Ordinal));
    }
}
