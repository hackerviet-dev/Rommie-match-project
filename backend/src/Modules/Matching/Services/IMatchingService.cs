using System.ComponentModel.DataAnnotations;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Matching.Services;

public interface IMatchingService
{
    object GetModuleStatus();

    Task<MatchListResult> GetMatchesAsync(
        Guid userId,
        PageQuery paging,
        MatchFilterQuery filters,
        CancellationToken cancellationToken);

    /// Returns null when the candidate is not in the caller's list: never scored, hidden,
    /// disabled, or blocked in either direction.
    Task<MatchDetailDto?> GetMatchDetailAsync(
        Guid userId,
        Guid candidateId,
        CancellationToken cancellationToken);

    Task<RecalculationResult> RecalculateAsync(
        Guid userId,
        CancellationToken cancellationToken);

    Task<MatchingUsageDto> GetUsageAsync(Guid userId, CancellationToken cancellationToken);

    Task<BoostResult> ActivateBoostAsync(Guid userId, CancellationToken cancellationToken);
}

// Bound from the query string of GET /api/matching/me/matches. The first group is the
// free "Bộ lọc tiêu chuẩn"; the second is Premium's "Bộ lọc nâng cao".
public sealed class MatchFilterQuery : IValidatableObject
{
    // Name or interest, case-insensitive substring.
    [StringLength(60)]
    public string? Q { get; init; }

    [Range(0, 100)]
    public int? MinScore { get; init; }

    public bool SameCity { get; init; }

    public bool PetFriendly { get; init; }

    public bool NonSmoking { get; init; }

    // Candidates moving in on or before this date; those without a date are left out.
    public DateOnly? MoveInBy { get; init; }

    // Premium: candidates whose budget range overlaps [BudgetMin, BudgetMax].
    [Range(0, 1_000_000_000)]
    public int? BudgetMin { get; init; }

    [Range(0, 1_000_000_000)]
    public int? BudgetMax { get; init; }

    [StringLength(100)]
    public string? District { get; init; }

    [AllowedValues("quiet", "moderate", "lively", null)]
    public string? RoomEnvironment { get; init; }

    [Range(1, 5)]
    public int? MinCleanliness { get; init; }

    public bool VerifiedOnly { get; init; }

    public bool HasAdvancedFilters()
    {
        return BudgetMin is not null
            || BudgetMax is not null
            || !string.IsNullOrWhiteSpace(District)
            || RoomEnvironment is not null
            || MinCleanliness is not null
            || VerifiedOnly;
    }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (BudgetMin is { } min && BudgetMax is { } max && max < min)
        {
            yield return new ValidationResult(
                "Ngân sách tối đa phải lớn hơn hoặc bằng ngân sách tối thiểu.",
                [nameof(BudgetMin), nameof(BudgetMax)]);
        }
    }
}

public enum MatchingError
{
    None,
    PremiumRequired,
    ScanQuotaExceeded,
    NoPreferences,
    ProfileHidden,
    BoostAlreadyActive,
    BoostQuotaExceeded
}

public sealed record MatchListResult(MatchingError Error, PagedResult<RoommateMatchDto>? Matches);

// Key is stable for code ("noise"); Label is the Vietnamese text to show ("Chịu ồn").
public sealed record ScoreComponentDto(string Key, string Label, int Value, int Weight);

public sealed record RoommateMatchDto(
    Guid Id,
    string Name,
    // Null when the member hides their age or has not given it.
    int? Age,
    string? Occupation,
    string City,
    string? District,
    string? AvatarUrl,
    bool IsVerified,
    int Score,
    IReadOnlyList<ScoreComponentDto> Breakdown,
    string? Explanation,
    int BudgetMin,
    int BudgetMax,
    IReadOnlyList<string> Interests,
    bool IsBoosted);

// One criterion side by side: the caller's value and the candidate's, already worded.
public sealed record ComparisonRowDto(string Key, string Label, string Mine, string Theirs);

public sealed record MatchDetailDto(
    RoommateMatchDto Match,
    string? Bio,
    IReadOnlyList<string> SharedInterests,
    DateTimeOffset CalculatedAt,
    // Premium's "Phân tích hợp nhau nâng cao". Null on the free plan.
    IReadOnlyList<ComparisonRowDto>? Comparison,
    bool ComparisonLocked);

// Matches is the first page; later pages come from GET /api/matching/me/matches.
public sealed record MatchRecalculationResult(
    int CandidatesScored,
    PagedResult<RoommateMatchDto> Matches);

public sealed record RecalculationResult(
    MatchingError Error,
    MatchRecalculationResult? Recalculation,
    DateTimeOffset? QuotaResetsAt);

public sealed record BoostDto(Guid Id, DateTimeOffset StartsAt, DateTimeOffset EndsAt);

public sealed record BoostResult(
    MatchingError Error,
    BoostDto? Boost,
    DateTimeOffset? QuotaResetsAt);

// Limits are null when unlimited. Periods are calendar months in Vietnam time.
public sealed record MatchingUsageDto(
    bool IsPremium,
    int ScansUsed,
    int? ScansLimit,
    int? ScansRemaining,
    int BoostsUsed,
    int BoostsLimit,
    BoostDto? ActiveBoost,
    DateTimeOffset PeriodStartsAt,
    DateTimeOffset PeriodResetsAt);
