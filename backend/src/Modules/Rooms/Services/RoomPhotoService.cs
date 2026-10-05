using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Rooms.Services;

public sealed class RoomPhotoException(int status, string message) : Exception(message) { public int Status { get; } = status; }
public sealed class RoomPhotoService(IHttpClientFactory clients, IConfiguration config, IDbConnectionFactory factory)
{
    public async Task<string> Upload(Guid owner, IFormFile photo, CancellationToken ct)
    {
        var cloud = config["Cloudinary:CloudName"]; var key = config["Cloudinary:ApiKey"]; var secret = config["Cloudinary:ApiSecret"];
        if (string.IsNullOrWhiteSpace(cloud) || string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(secret))
            throw new RoomPhotoException(503, "Upload ảnh chưa được cấu hình Cloudinary. Vui lòng thử lại sau.");
        if (photo.Length is <= 0 or > 10 * 1024 * 1024) throw new RoomPhotoException(400, "Ảnh phải nhỏ hơn hoặc bằng 10 MB.");
        using var stream = new MemoryStream(); await photo.CopyToAsync(stream, ct); var bytes = stream.ToArray();
        var mime = bytes.Length >= 12 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff ? "image/jpeg"
            : bytes.Length >= 12 && bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }) ? "image/png"
            : bytes.Length >= 12 && Encoding.ASCII.GetString(bytes, 0, 4) == "RIFF" && Encoding.ASCII.GetString(bytes, 8, 4) == "WEBP" ? "image/webp" : null;
        if (mime is null) throw new RoomPhotoException(400, "Chỉ hỗ trợ ảnh JPEG, PNG, WebP hợp lệ.");
        var publicId = $"roomiematch/rooms/{owner:N}/{Guid.NewGuid():N}";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        var signature = Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes($"public_id={publicId}&timestamp={timestamp}{secret}"))).ToLowerInvariant();
        using var body = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes); file.Headers.ContentType = new(mime);
        body.Add(file, "file", "room-photo"); body.Add(new StringContent(publicId), "public_id");
        body.Add(new StringContent(timestamp), "timestamp"); body.Add(new StringContent(key), "api_key"); body.Add(new StringContent(signature), "signature");
        using var response = await clients.CreateClient("room-photos").PostAsync($"https://api.cloudinary.com/v1_1/{Uri.EscapeDataString(cloud)}/image/upload", body, ct);
        if (!response.IsSuccessStatusCode) throw new RoomPhotoException(502, "Cloudinary không nhận được ảnh. Vui lòng thử lại.");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(ct));
        var url = json.RootElement.GetProperty("secure_url").GetString()!;
        await using var connection = await factory.OpenConnectionAsync(ct); await using var cmd = connection.CreateCommand();
        cmd.CommandText = "INSERT INTO room_photo_assets(owner_user_id,url,public_id) VALUES(@owner,@url,@public)";
        cmd.AddParameter("owner", owner).AddParameter("url", url).AddParameter("public", publicId); await cmd.ExecuteNonQueryAsync(ct);
        return url;
    }
    public async Task<bool> Owns(Guid owner, string[]? urls, CancellationToken ct)
    {
        if (urls is null || urls.Length == 0) return true;
        await using var connection = await factory.OpenConnectionAsync(ct); await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT count(*) FROM room_photo_assets WHERE owner_user_id=@owner AND url=ANY(@urls)";
        cmd.AddParameter("owner", owner).AddParameter("urls", urls.Distinct().ToArray());
        return (long)(await cmd.ExecuteScalarAsync(ct))! == urls.Distinct().Count();
    }
}
