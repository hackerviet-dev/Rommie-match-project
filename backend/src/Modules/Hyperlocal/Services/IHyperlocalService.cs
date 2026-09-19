using System.ComponentModel.DataAnnotations;

namespace RoomieMatch.Modules.Hyperlocal.Services;

public interface IHyperlocalService
{
    object GetModuleStatus();

    Task<IReadOnlyList<LocalServiceDto>> GetNearbyServicesAsync(
        string city,
        string? district,
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
    [Required, StringLength(80, MinimumLength = 2)] string Category,
    [Required, StringLength(160, MinimumLength = 2)] string Name,
    [StringLength(2000)] string? Description,
    [Phone, StringLength(30)] string? Phone,
    [Required, StringLength(100)] string District,
    [Required, StringLength(100)] string City,
    [Required, Range(typeof(decimal), "0", "999.99", ParseLimitsInInvariantCulture = true)]
    decimal? DistanceKm,
    [Required, Range(typeof(decimal), "0", "5", ParseLimitsInInvariantCulture = true)]
    decimal? Rating,
    [Range(0, 1_000_000_000)] int ReviewCount,
    [Range(0, 1_000_000_000)] int PriceFrom,
    bool? IsVerified);
