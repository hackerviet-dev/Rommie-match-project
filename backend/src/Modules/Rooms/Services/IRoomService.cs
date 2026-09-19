using System.ComponentModel.DataAnnotations;

namespace RoomieMatch.Modules.Rooms.Services;

public interface IRoomService
{
    object GetModuleStatus();

    Task<IReadOnlyList<RoomDto>> SearchAsync(
        RoomSearchQuery query,
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
    IReadOnlyList<string> Amenities,
    decimal? Latitude,
    decimal? Longitude,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record SaveRoomRequest(
    [Required, StringLength(180, MinimumLength = 4)] string Title,
    [StringLength(4000)] string? Description,
    [Required, StringLength(500, MinimumLength = 4)] string Address,
    [Required, StringLength(100)] string District,
    [Required, StringLength(100)] string City,
    [Required, Range(0, 1_000_000_000)] int? MonthlyRent,
    [Range(0, 1_000_000_000)] int Deposit,
    [Required] DateOnly? AvailableFrom,
    [Range(1, 20)] int MaxOccupants,
    string[]? Amenities,
    [Range(typeof(decimal), "-90", "90", ParseLimitsInInvariantCulture = true)]
    decimal? Latitude,
    [Range(typeof(decimal), "-180", "180", ParseLimitsInInvariantCulture = true)]
    decimal? Longitude,
    bool? IsActive) : IValidatableObject
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

        if (Amenities is { Length: > MaxAmenities })
        {
            yield return new ValidationResult(
                $"Chỉ được liệt kê tối đa {MaxAmenities} tiện ích.",
                [nameof(Amenities)]);
        }

        if (Amenities?.Any(amenity => amenity.Length > MaxAmenityLength) == true)
        {
            yield return new ValidationResult(
                $"Mỗi tiện ích tối đa {MaxAmenityLength} ký tự.",
                [nameof(Amenities)]);
        }
    }
}
