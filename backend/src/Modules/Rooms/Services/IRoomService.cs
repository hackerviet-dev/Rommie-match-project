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
    NotOwner
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
    string? ModerationNote);

public static class RoomPropertyTypes
{
    public static readonly IReadOnlySet<string> All =
        new HashSet<string>(StringComparer.Ordinal) { "apartment", "house", "studio", "dormitory" };
}

public sealed record SaveRoomRequest(
    [Required, StringLength(180, MinimumLength = 4)] [property: Description("Tiêu đề tin phòng, 4-180 ký tự.")] string Title,
    [StringLength(4000)] [property: Description("Mô tả; phòng tối đa 4000 ký tự, dịch vụ tối đa 2000 ký tự.")] string? Description,
    [Required, StringLength(500, MinimumLength = 4)] [property: Description("Địa chỉ, 4-500 ký tự.")] string Address,
    [Required, StringLength(100)] [property: Description("Tên quận/huyện, tối đa 100 ký tự.")] string District,
    [Required, StringLength(100)] [property: Description("Tên thành phố, ví dụ TP.HCM, tối đa 100 ký tự.")] string City,
    [Required, Range(0, 1_000_000_000)] [property: Description("Giá thuê mỗi tháng, đơn vị VND, 0-1000000000.")] int? MonthlyRent,
    [Range(0, 1_000_000_000)] [property: Description("Tiền đặt cọc, đơn vị VND, 0-1000000000.")] int Deposit,
    [Required, NotPastDate] [property: Description("Ngày phòng bắt đầu sẵn sàng, dạng yyyy-MM-dd, từ hôm nay trở đi theo giờ Việt Nam.")] DateOnly? AvailableFrom,
    [Range(1, 20)] [property: Description("Số người ở tối đa, từ 1 đến 20 (bao gồm người đăng).")] int MaxOccupants,
    [property: Description("Loại nhà: apartment, house, studio hoặc dormitory; có thể null.")] string? PropertyType,
    [Range(1, 50)] [property: Description("Số phòng ngủ, 1-50; có thể null.")] int? Bedrooms,
    [Range(typeof(decimal), "1", "99999.9", ParseLimitsInInvariantCulture = true)]
    [property: Description("Diện tích m², 1-99999.9; có thể null.")] decimal? AreaM2,
    [Range(1, 20)] [property: Description("Số bạn cùng phòng cần tìm, 1-20 và nhỏ hơn maxOccupants; có thể null.")] int? RoommatesNeeded,
    [property: Description("Danh sách tiện ích: tối đa 30 mục, mỗi mục tối đa 60 ký tự; phần tử null bị từ chối với 400 (mục trùng nhau được gộp, mục rỗng bị bỏ qua).")] string[]? Amenities,
    [Range(typeof(decimal), "-90", "90", ParseLimitsInInvariantCulture = true)]
    [property: Description("Vĩ độ -90 đến 90; phải gửi cùng longitude hoặc bỏ cả hai.")] decimal? Latitude,
    [Range(typeof(decimal), "-180", "180", ParseLimitsInInvariantCulture = true)]
    [property: Description("Kinh độ -180 đến 180; phải gửi cùng latitude hoặc bỏ cả hai.")] decimal? Longitude,
    [property: Description("Có hiển thị tin phòng hay không; null dùng mặc định của server.")] bool? IsActive) : IValidatableObject
{
    public const int MaxAmenities = 30;
    public const int MaxAmenityLength = 60;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
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
