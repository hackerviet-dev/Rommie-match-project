using System.ComponentModel;
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
    [Required] [property: Description("Thời gian hẹn ISO 8601 có múi giờ, ví dụ 2026-10-03T09:00:00+07:00; sau hiện tại 30 phút đến 60 ngày.")] DateTimeOffset? ScheduledAt,
    [Required, StringLength(500, MinimumLength = 4)] [property: Description("Địa chỉ, 4-500 ký tự.")] string Address,
    [Required, Phone, StringLength(30)] [property: Description("Số điện thoại liên hệ hợp lệ, tối đa 30 ký tự.")] string ContactPhone,
    [StringLength(1000)] [property: Description("Ghi chú đặt lịch, tối đa 1000 ký tự; có thể null.")] string? Note) : IValidatableObject
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
