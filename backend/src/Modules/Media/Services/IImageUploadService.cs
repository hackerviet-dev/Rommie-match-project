using System.ComponentModel;
using RoomieMatch.Shared.Contracts;

namespace RoomieMatch.Modules.Media.Services;

public interface IImageUploadService
{
    object GetModuleStatus();

    // Checks the bytes are a JPEG, PNG or WebP within the size limit, then stores the image in
    // the uploader's folder for that purpose.
    Task<MediaResult<UploadedImageDto>> UploadAsync(
        Guid userId,
        ImagePurpose purpose,
        Stream content,
        long length,
        CancellationToken cancellationToken);
}

public enum MediaError
{
    None,
    NotConfigured,
    InvalidFile,
    TooLarge,
    UploadFailed
}

public sealed record MediaResult<T>(MediaError Error, T? Value)
{
    public static MediaResult<T> Success(T value) => new(MediaError.None, value);

    public static MediaResult<T> Failure(MediaError error) => new(error, default);
}

public sealed record UploadedImageDto(
    [property: Description("URL HTTPS của ảnh trên Cloudinary; gửi lại URL này trong avatarUrl hoặc imageUrl của tin nhắn.")] string Url,
    [property: Description("Mã ảnh trên Cloudinary.")] string PublicId,
    int Width,
    int Height,
    [property: Description("Dung lượng ảnh đã lưu, tính bằng byte.")] long Bytes,
    [property: Description("jpg, png hoặc webp.")] string Format);

public static class MediaRules
{
    public const long MaxImageBytes = 5 * 1024 * 1024;

    // Longest side kept on Cloudinary. Re-encoding through this transformation also drops EXIF
    // metadata such as the GPS position a phone writes into photos.
    public const int MaxImageDimension = 2048;
}

public static class MediaErrors
{
    public static string Message(MediaError error)
    {
        return error switch
        {
            MediaError.NotConfigured => "Máy chủ chưa được cấu hình lưu trữ ảnh. Vui lòng thử lại sau.",
            MediaError.InvalidFile => "Chỉ nhận ảnh JPG, PNG hoặc WebP.",
            MediaError.TooLarge => $"Ảnh tối đa {MediaRules.MaxImageBytes / 1024 / 1024} MB.",
            MediaError.UploadFailed => "Không tải được ảnh lên. Vui lòng thử lại.",
            _ => throw new ArgumentOutOfRangeException(nameof(error), error, null)
        };
    }
}
