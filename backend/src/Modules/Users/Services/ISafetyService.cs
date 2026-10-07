using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Services;

// Member-side safety tools. The caller always comes from the token; the target is the
// member being blocked or reported. Moderators review reports through AdminService.
public interface ISafetyService
{
    Task<SafetyError> BlockAsync(Guid userId, Guid targetId, CancellationToken cancellationToken);

    Task UnblockAsync(Guid userId, Guid targetId, CancellationToken cancellationToken);

    Task<PagedResult<BlockedUserDto>> GetBlocksAsync(Guid userId, PageQuery paging, CancellationToken cancellationToken);

    Task<SafetyResult<UserReportDto>> ReportAsync(
        Guid userId,
        Guid targetId,
        CreateUserReportRequest request,
        CancellationToken cancellationToken);

    // Reports a room listing; the reported member is the room owner and the report keeps room_id.
    Task<SafetyResult<UserReportDto>> ReportRoomAsync(
        Guid userId,
        Guid roomId,
        CreateUserReportRequest request,
        CancellationToken cancellationToken);
}

public enum SafetyError
{
    None,
    // An id with no account behind it.
    NotFound,
    Self,
    // Staff accounts cannot be blocked: members must still be reachable by moderation.
    StaffTarget,
    // The caller already has an open report against this member (or this room).
    ReportAlreadyOpen,
    // A room id with no live listing behind it.
    RoomNotFound
}

public sealed record SafetyResult<T>(SafetyError Error, T? Value)
{
    public static SafetyResult<T> Success(T value) => new(SafetyError.None, value);

    public static SafetyResult<T> Failure(SafetyError error) => new(error, default);
}

public sealed record BlockedUserDto(Guid UserId, string DisplayName, string? AvatarUrl, DateTimeOffset BlockedAt);

public sealed record UserReportDto(
    Guid Id,
    Guid ReportedUserId,
    string Reason,
    string? Details,
    string Status,
    DateTimeOffset CreatedAt,
    [property: Description("UUID phòng bị báo cáo; null khi báo cáo thành viên nói chung.")] Guid? RoomId = null);

public sealed record CreateUserReportRequest(
    [Required, AllowedValues(ReportReasons.Fake, ReportReasons.Scam, ReportReasons.Harass, ReportReasons.Sexual,
        ReportReasons.Spam, ReportReasons.Underage, ReportReasons.Other)]
    [property: Description("Lý do: fake (giả mạo), scam (lừa đảo), harass (quấy rối), sexual (nội dung tình dục), spam, underage (chưa đủ tuổi) hoặc other (khác, bắt buộc kèm details).")]
    string Reason,
    [StringLength(2000)]
    [property: Description("Mô tả thêm, tối đa 2000 ký tự; bắt buộc khi reason=other.")]
    string? Details) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Reason == ReportReasons.Other && string.IsNullOrWhiteSpace(Details))
        {
            yield return new ValidationResult(
                "Vui lòng mô tả lý do khi chọn \"Khác\".",
                [nameof(Details)]);
        }
    }
}

// Matches the CHECK constraint on user_reports.reason.
public static class ReportReasons
{
    public const string Fake = "fake";
    public const string Scam = "scam";
    public const string Harass = "harass";
    public const string Sexual = "sexual";
    public const string Spam = "spam";
    public const string Underage = "underage";
    public const string Other = "other";
}
