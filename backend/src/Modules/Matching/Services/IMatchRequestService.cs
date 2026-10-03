using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Matching.Services;

// "Xác nhận ghép thành công" needs both members: one invites, the other accepts. Every
// method takes the caller from the token and answers NotFound for requests the caller is
// not part of, so a request id alone reveals nothing.
public interface IMatchRequestService
{
    Task<MatchRequestResult> CreateAsync(
        Guid userId,
        CreateMatchRequestRequest request,
        CancellationToken cancellationToken);

    Task<PagedResult<MatchRequestDto>> GetMineAsync(
        Guid userId,
        MatchRequestQuery query,
        PageQuery paging,
        CancellationToken cancellationToken);

    Task<MatchRequestDto?> GetAsync(Guid userId, Guid requestId, CancellationToken cancellationToken);

    Task<MatchRequestResult> TransitionAsync(
        Guid userId,
        Guid requestId,
        MatchRequestAction action,
        CancellationToken cancellationToken);
}

public enum MatchRequestAction
{
    // Recipient, pending -> accepted.
    Accept,
    // Recipient, pending -> declined.
    Decline,
    // Requester, pending -> cancelled.
    Cancel,
    // Either member, accepted -> ended ("huỷ ghép").
    End
}

public enum MatchRequestError
{
    None,
    NotFound,
    Self,
    // The pair already has an open request; the result carries it.
    AlreadyPending,
    AlreadyMatched,
    RecipientOnly,
    RequesterOnly,
    NotPending,
    NotMatched,
    // A block exists in either direction, so the request cannot be accepted.
    Blocked
}

public sealed record MatchRequestResult(MatchRequestError Error, MatchRequestDto? Request)
{
    public static MatchRequestResult Success(MatchRequestDto request) => new(MatchRequestError.None, request);

    public static MatchRequestResult Failure(MatchRequestError error, MatchRequestDto? existing = null) =>
        new(error, existing);
}

public static class MatchRequestStatuses
{
    public const string Pending = "pending";
    public const string Accepted = "accepted";
    public const string Declined = "declined";
    public const string Cancelled = "cancelled";
    public const string Ended = "ended";
}

public sealed record MatchPartnerDto(Guid UserId, string DisplayName, string? AvatarUrl, bool IsVerified);

public sealed record MatchRequestDto(
    Guid Id,
    // "outgoing" when the caller sent the invitation, "incoming" when the caller received it.
    string Direction,
    MatchPartnerDto Partner,
    string? Message,
    string Status,
    bool IsBlocked,
    DateTimeOffset CreatedAt,
    DateTimeOffset? RespondedAt,
    DateTimeOffset? EndedAt,
    Guid? EndedBy,
    DateTimeOffset UpdatedAt);

public sealed record CreateMatchRequestRequest(
    [Required] [property: Description("UUID thành viên muốn ghép làm bạn cùng phòng, ví dụ id trong danh sách ghép đôi; không phải id chính mình.")] Guid? CandidateId,
    [StringLength(500)] [property: Description("Lời nhắn kèm lời mời, tối đa 500 ký tự; có thể null.")] string? Message);

public sealed class MatchRequestQuery
{
    [AllowedValues("incoming", "outgoing", null)]
    [Description("incoming: lời mời tôi nhận; outgoing: lời mời tôi gửi; bỏ trống để lấy cả hai.")]
    public string? Direction { get; init; }

    [AllowedValues(MatchRequestStatuses.Pending, MatchRequestStatuses.Accepted, MatchRequestStatuses.Declined,
        MatchRequestStatuses.Cancelled, MatchRequestStatuses.Ended, null)]
    [Description("Lọc theo trạng thái pending/accepted/declined/cancelled/ended; accepted là danh sách đã ghép thành công. Bỏ trống để lấy mọi trạng thái.")]
    public string? Status { get; init; }
}
