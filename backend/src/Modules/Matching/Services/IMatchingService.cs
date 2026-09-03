namespace RoomieMatch.Modules.Matching.Services;

public interface IMatchingService
{
    object GetModuleStatus();
    Task<IReadOnlyList<RoommateMatchDto>> GetMatchesAsync(
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
