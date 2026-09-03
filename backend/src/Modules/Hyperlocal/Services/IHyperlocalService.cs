namespace RoomieMatch.Modules.Hyperlocal.Services;

public interface IHyperlocalService
{
    object GetModuleStatus();
    Task<IReadOnlyList<LocalServiceDto>> GetNearbyServicesAsync(
        string city,
        string? district,
        CancellationToken cancellationToken);
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
