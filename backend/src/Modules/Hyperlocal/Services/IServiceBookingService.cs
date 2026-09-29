using System.ComponentModel.DataAnnotations;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Hyperlocal.Services;

// Bookings are always the caller's own: the user id comes from the token, never the
// request, and another member's booking answers 404 as if it did not exist.
public interface IServiceBookingService
{
    Task<ServiceBookingDto?> CreateAsync(
        Guid userId,
        Guid serviceId,
        CreateServiceBookingRequest request,
        CancellationToken cancellationToken);

    Task<PagedResult<ServiceBookingDto>> GetMineAsync(
        Guid userId,
        PageQuery paging,
        CancellationToken cancellationToken);

    Task<ServiceBookingDto?> GetMineAsync(Guid userId, Guid bookingId, CancellationToken cancellationToken);

    Task<BookingCancelResult> CancelAsync(Guid userId, Guid bookingId, CancellationToken cancellationToken);
}

public enum BookingCancelError
{
    None,
    NotFound,
    NotCancellable
}

public sealed record BookingCancelResult(BookingCancelError Error, ServiceBookingDto? Booking)
{
    public static BookingCancelResult Success(ServiceBookingDto booking) => new(BookingCancelError.None, booking);

    public static BookingCancelResult Failure(BookingCancelError error) => new(error, null);
}

public sealed record ServiceBookingDto(
    Guid Id,
    Guid ServiceId,
    string ServiceName,
    string ServiceCategory,
    string? ServicePhone,
    DateTimeOffset ScheduledAt,
    string Address,
    string ContactPhone,
    string? Note,
    string Status,
    DateTimeOffset? CancelledAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CreateServiceBookingRequest(
    [Required] DateTimeOffset? ScheduledAt,
    [Required, StringLength(500, MinimumLength = 4)] string Address,
    [Required, Phone, StringLength(30)] string ContactPhone,
    [StringLength(1000)] string? Note) : IValidatableObject
{
    public static readonly TimeSpan MinLeadTime = TimeSpan.FromMinutes(30);
    public static readonly TimeSpan MaxLeadTime = TimeSpan.FromDays(60);

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ScheduledAt is not { } scheduledAt)
        {
            yield break;
        }

        var now = DateTimeOffset.UtcNow;
        if (scheduledAt < now + MinLeadTime)
        {
            yield return new ValidationResult(
                $"Thời gian hẹn phải sau hiện tại ít nhất {MinLeadTime.TotalMinutes:0} phút.",
                [nameof(ScheduledAt)]);
        }
        else if (scheduledAt > now + MaxLeadTime)
        {
            yield return new ValidationResult(
                $"Chỉ được đặt trước tối đa {MaxLeadTime.TotalDays:0} ngày.",
                [nameof(ScheduledAt)]);
        }
    }
}
