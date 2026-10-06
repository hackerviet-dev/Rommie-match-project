using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using RoomieMatch.Shared.Paging;
using RoomieMatch.Shared.Validation;

namespace RoomieMatch.Modules.Rooms.Services;

public interface IRoomService
{
    object GetModuleStatus();

    Task<PagedResult<RoomDto>> SearchAsync(
        RoomSearchQuery query,
        PageQuery paging,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<RoomDto>> GetOwnedByAsync(Guid ownerUserId, CancellationToken cancellationToken);

    Task<RoomDto?> GetAsync(Guid roomId, CancellationToken cancellationToken);

    Task<RoomDto> CreateAsync(
        Guid ownerUserId,
        SaveRoomRequest request,
        CancellationToken cancellationToken);

    Task<RoomWriteResult> UpdateAsync(
        Guid roomId,
        Guid ownerUserId,
        SaveRoomRequest request,
        CancellationToken cancellationToken);

    Task<RoomWriteError> DeleteAsync(
        Guid roomId,
        Guid ownerUserId,
        CancellationToken cancellationToken);
}

public enum RoomWriteError
{
    None,
    NotFound,
    NotOwner,
    ApprovedLocked
}

public sealed record RoomWriteResult(RoomWriteError Error, RoomDto? Room)
{
    public static RoomWriteResult Success(RoomDto room) => new(RoomWriteError.None, room);

    public static RoomWriteResult Failure(RoomWriteError error) => new(error, null);
}

public sealed record RoomSearchQuery(
    string? City,
    string? District,
    int? MaxRent,
    DateOnly? AvailableBy);

public sealed record RoomDto(
    Guid Id,
    Guid OwnerUserId,
    string OwnerDisplayName,
    string? OwnerAvatarUrl,
    string Title,
    string? Description,
    string Address,
    string District,
    string City,
    int MonthlyRent,
    int Deposit,
    DateOnly AvailableFrom,
    int MaxOccupants,
    string? PropertyType,
    int? Bedrooms,
    decimal? AreaM2,
    int? RoommatesNeeded,
    IReadOnlyList<string> Amenities,
    decimal? Latitude,
    decimal? Longitude,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    string ModerationStatus,
    string? ModerationNote,
    IReadOnlyList<string> PhotoUrls, string? GoogleMapsUrl, string? GoogleMapsEmbedUrl);

public static class RoomPropertyTypes
{
    public static readonly IReadOnlySet<string> All =
        new HashSet<string>(StringComparer.Ordinal) { "apartment", "house", "studio", "dormitory" };
}

public sealed record SaveRoomRequest(
    [Required, StringLength(180, MinimumLength = 4)] [property: Description("Tiêu đề tin phòng, 4-180 ký tự.")] string Title,
    [Required, StringLength(4000)] [property: Description("Mô tả phòng bắt buộc, tối đa 4000 ký tự.")] string? Description,
    [Required, StringLength(500, MinimumLength = 4)] [property: Description("Địa chỉ, 4-500 ký tự.")] string Address,
    [Required, StringLength(100)] [property: Description("Tên quận/huyện, tối đa 100 ký tự.")] string District,
    [Required, StringLength(100)] [property: Description("Tên thành phố, ví dụ TP.HCM, tối đa 100 ký tự.")] string City,
    [Required, Range(1, 1_000_000_000)] [property: Description("Giá thuê mỗi tháng bắt buộc lớn hơn 0, đơn vị VND.")] int? MonthlyRent,
    [Required, Range(0, 1_000_000_000)] [property: Description("Tiền đặt cọc bắt buộc nhập, có thể là 0 VND.")] int? Deposit,
    [Required, NotPastDate] [property: Description("Ngày phòng bắt đầu sẵn sàng, dạng yyyy-MM-dd, từ hôm nay trở đi theo giờ Việt Nam.")] DateOnly? AvailableFrom,
    [Range(2, 2)] [property: Description("Chỉ hỗ trợ cặp 2 người.")] int MaxOccupants,
    [property: Description("Loại nhà bắt buộc: apartment, house, studio hoặc dormitory.")] string? PropertyType,
    [Required, Range(1, 50)] [property: Description("Số phòng ngủ bắt buộc, 1-50.")] int? Bedrooms,
    [Required, Range(typeof(decimal), "1", "99999.9", ParseLimitsInInvariantCulture = true)]
    [property: Description("Diện tích m² bắt buộc, 1-99999.9.")] decimal? AreaM2,
    [Required, Range(1, 1)] [property: Description("Bắt buộc tuyển thêm đúng 01 người.")] int? RoommatesNeeded,
    [property: Description("Danh sách tiện ích: tối đa 30 mục, mỗi mục tối đa 60 ký tự; phần tử null bị từ chối với 400 (mục trùng nhau được gộp, mục rỗng bị bỏ qua).")] string[]? Amenities,
    [Range(typeof(decimal), "-90", "90", ParseLimitsInInvariantCulture = true)]
    [property: Description("Vĩ độ -90 đến 90; phải gửi cùng longitude hoặc bỏ cả hai.")] decimal? Latitude,
    [Range(typeof(decimal), "-180", "180", ParseLimitsInInvariantCulture = true)]
    [property: Description("Kinh độ -180 đến 180; phải gửi cùng latitude hoặc bỏ cả hai.")] decimal? Longitude,
    [property: Description("Có hiển thị tin phòng hay không; null dùng mặc định của server.")] bool? IsActive,
    [property: Description("Bắt buộc 1-10 URL ảnh đã upload bởi chính người đăng, cả khi tạo và sửa.")] string[]? PhotoUrls = null,
    bool PairOccupancyConfirmed = false,
    bool AccuracyAndResidenceConfirmed = false,
    [StringLength(2048)] string? GoogleMapsUrl = null,
    [StringLength(8192)] string? GoogleMapsEmbedUrl = null) : IValidatableObject
{
    public const int MaxAmenities = 30;
    public const int MaxAmenityLength = 60;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Address) || !System.Text.RegularExpressions.Regex.IsMatch(Address.Trim(), @"^\d+\p{L}?(?:[/-]\d+\p{L}?)*(?:\s+|,\s*)\p{L}[\p{L}\p{N}\s.,/'’()\-]*$") || System.Text.RegularExpressions.Regex.Matches(Address, @"\p{L}").Count < 2)
            yield return new ValidationResult("Nhập số nhà và tên đường, ví dụ: 205/10A đường Hoàng Văn Thụ.", [nameof(Address)]);
        if (!RoomLocations.IsProvince(City))
            yield return new ValidationResult("Chọn tỉnh / thành phố trong danh sách.", [nameof(City)]);
        else if (!RoomLocations.IsArea(City, District))
            yield return new ValidationResult("Chọn phường / xã thuộc tỉnh / thành phố đã chọn.", [nameof(District)]);
        if (string.IsNullOrWhiteSpace(GoogleMapsUrl) && string.IsNullOrWhiteSpace(GoogleMapsEmbedUrl))
            yield return new ValidationResult("Bắt buộc lưu link hoặc bản đồ nhúng của phòng.", [nameof(GoogleMapsUrl),nameof(GoogleMapsEmbedUrl)]);
        if (!string.IsNullOrWhiteSpace(GoogleMapsEmbedUrl) && (!Uri.TryCreate(GoogleMapsEmbedUrl.Trim(), UriKind.Absolute, out var embedUri) || embedUri.Scheme != "https" || !embedUri.IsDefaultPort || !string.IsNullOrEmpty(embedUri.UserInfo) || (embedUri.Host != "www.google.com" && embedUri.Host != "google.com") || embedUri.AbsolutePath != "/maps/embed" || !Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(embedUri.Query).TryGetValue("pb", out var pb) || string.IsNullOrWhiteSpace(pb.ToString())))
            yield return new ValidationResult("URL nhúng Google Maps không hợp lệ.", [nameof(GoogleMapsEmbedUrl)]);
        if (string.IsNullOrWhiteSpace(PropertyType))
            yield return new ValidationResult("Chọn loại nhà.", [nameof(PropertyType)]);
        if (Amenities is null || !Amenities.Any(a => !string.IsNullOrWhiteSpace(a)))
            yield return new ValidationResult("Nhập ít nhất 1 tiện ích.", [nameof(Amenities)]);
        if (PhotoUrls is null || PhotoUrls.Length == 0)
            yield return new ValidationResult("Bắt buộc thêm ít nhất 1 ảnh phòng.", [nameof(PhotoUrls)]);
        if (!string.IsNullOrWhiteSpace(GoogleMapsUrl) && (!Uri.TryCreate(GoogleMapsUrl.Trim(), UriKind.Absolute, out var mapsUri) || !GeoService.IsMapsUrl(mapsUri)))
            yield return new ValidationResult("Chỉ chấp nhận link Google Maps HTTPS hợp lệ.", [nameof(GoogleMapsUrl)]);
        if (!PairOccupancyConfirmed)
            yield return new ValidationResult("Bạn cần cam kết phòng hiện có tối đa 01 người và chỉ tuyển thêm đúng 01 người để ghép thành cặp 2 người.", [nameof(PairOccupancyConfirmed)]);
        if (!AccuracyAndResidenceConfirmed)
            yield return new ValidationResult("Bạn cần cam kết thông tin phòng chính xác và phối hợp đăng ký tạm trú cho thành viên mới trước khi đăng phòng.", [nameof(AccuracyAndResidenceConfirmed)]);
        if (PhotoUrls is { Length: > 10 } || PhotoUrls?.Any(url => url is null || url.Length > 2048 || !Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != "https") == true)
            yield return new ValidationResult("Tối đa 10 ảnh HTTPS đã upload hợp lệ.", [nameof(PhotoUrls)]);
        if (Latitude is null != Longitude is null)
        {
            yield return new ValidationResult(
                "Toạ độ phải có đủ cả vĩ độ và kinh độ, hoặc bỏ trống cả hai.",
                [nameof(Latitude), nameof(Longitude)]);
        }

        if (PropertyType is not null && !RoomPropertyTypes.All.Contains(PropertyType))
        {
            yield return new ValidationResult(
                "Loại nhà phải là apartment, house, studio hoặc dormitory.",
                [nameof(PropertyType)]);
        }

        // The poster lives there too, so at most MaxOccupants - 1 roommates can join.
        if (RoommatesNeeded is not null && RoommatesNeeded >= MaxOccupants)
        {
            yield return new ValidationResult(
                "Số bạn cùng phòng cần tìm phải nhỏ hơn số người ở tối đa.",
                [nameof(RoommatesNeeded), nameof(MaxOccupants)]);
        }

        if (Amenities is { Length: > MaxAmenities })
        {
            yield return new ValidationResult(
                $"Chỉ được liệt kê tối đa {MaxAmenities} tiện ích.",
                [nameof(Amenities)]);
        }

        // A JSON array can carry null elements (System.Text.Json maps them to null). Left
        // unchecked they reach string operations here and in NormalizeAmenities and turn a bad
        // request into a 500, so a null element is rejected. Blank entries keep the previous
        // behaviour: NormalizeAmenities trims them away.
        if (Amenities?.Any(amenity => amenity is null || amenity.Length > MaxAmenityLength) == true)
        {
            yield return new ValidationResult(
                $"Mỗi tiện ích không được để null và tối đa {MaxAmenityLength} ký tự.",
                [nameof(Amenities)]);
        }
    }
}
