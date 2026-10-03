using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Hyperlocal.Services;

public interface IHyperlocalService
{
    object GetModuleStatus();

    Task<PagedResult<LocalServiceDto>> GetNearbyServicesAsync(
        string city,
        string? district,
        string? category,
        string? q,
        PageQuery paging,
        CancellationToken cancellationToken);

    Task<LocalServiceDto?> GetServiceAsync(Guid serviceId, CancellationToken cancellationToken);

    Task<LocalServiceDto> CreateServiceAsync(
        SaveLocalServiceRequest request,
        CancellationToken cancellationToken);

    Task<LocalServiceDto?> UpdateServiceAsync(
        Guid serviceId,
        SaveLocalServiceRequest request,
        CancellationToken cancellationToken);

    Task<bool> DeleteServiceAsync(Guid serviceId, CancellationToken cancellationToken);
}

public sealed record LocalServiceDto(
    Guid Id,
    string Category,
    string Name,
    string? Description,
    string? Phone,
    string District,
    string City,
    decimal DistanceKm,
    decimal Rating,
    int ReviewCount,
    int PriceFrom,
    bool IsVerified);

public sealed record SaveLocalServiceRequest(
    [Required, StringLength(80, MinimumLength = 2)] [property: Description("Loại dịch vụ, 2-80 ký tự; ví dụ Giặt ủi hoặc Giao nước.")] string Category,
    [Required, StringLength(160, MinimumLength = 2)] [property: Description("Tên dịch vụ, 2-160 ký tự.")] string Name,
    [StringLength(2000)] [property: Description("Mô tả; phòng tối đa 4000 ký tự, dịch vụ tối đa 2000 ký tự.")] string? Description,
    [OptionalPhone, StringLength(30)] [property: Description("Số điện thoại dịch vụ hợp lệ, tối đa 30 ký tự; null, chuỗi rỗng hoặc khoảng trắng để bỏ trống.")] string? Phone,
    [Required, StringLength(100)] [property: Description("Tên quận/huyện, tối đa 100 ký tự.")] string District,
    [Required, StringLength(100)] [property: Description("Tên thành phố, ví dụ TP.HCM, tối đa 100 ký tự.")] string City,
    [Required, Range(typeof(decimal), "0", "999.99", ParseLimitsInInvariantCulture = true)]
    [property: Description("Khoảng cách km lưu trong danh mục, 0-999.99; không tính theo GPS người gọi.")] decimal? DistanceKm,
    [Required, Range(typeof(decimal), "0", "5", ParseLimitsInInvariantCulture = true)]
    [property: Description("Điểm đánh giá từ 0 đến 5.")] decimal? Rating,
    [Range(0, 1_000_000_000)] [property: Description("Số lượt đánh giá, 0-1000000000.")] int ReviewCount,
    [Range(0, 1_000_000_000)] [property: Description("Giá khởi điểm, đơn vị VND, 0-1000000000.")] int PriceFrom,
    [property: Description("Dịch vụ đã được xác minh hay chưa.")] bool? IsVerified);
