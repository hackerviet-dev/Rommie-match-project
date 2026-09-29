using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Matching.Services;

public interface IMatchingService
{
    object GetModuleStatus();

    Task<PagedResult<RoommateMatchDto>> GetMatchesAsync(
        Guid userId,
        PageQuery paging,
        CancellationToken cancellationToken);

    /// Returns null when the user has not saved lifestyle preferences yet.
    Task<MatchRecalculationResult?> RecalculateAsync(
        Guid userId,
        CancellationToken cancellationToken);
}

public sealed record RoommateMatchDto(
    Guid Id,
    string Name,
    int Age,
    string? Occupation,
    string City,
    string? District,
    string? AvatarUrl,
    bool IsVerified,
    int Score,
    string Breakdown,
    string? Explanation,
    int BudgetMin,
    int BudgetMax,
    string[] Interests);

// Matches is the first page; later pages come from GET /api/matching/me/matches.
public sealed record MatchRecalculationResult(
    int CandidatesScored,
    PagedResult<RoommateMatchDto> Matches);
