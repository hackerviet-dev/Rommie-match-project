using System.ComponentModel.DataAnnotations;

namespace RoomieMatch.Modules.Users.Services;

public interface IUserService
{
    object GetModuleStatus();

    Task<IReadOnlyList<UserProfileDto>> GetProfilesAsync(CancellationToken cancellationToken);

    Task<ProfileDetailDto?> GetProfileAsync(Guid userId, CancellationToken cancellationToken);

    Task<ProfileDetailDto?> UpdateProfileAsync(
        Guid userId,
        UpdateProfileRequest request,
        CancellationToken cancellationToken);

    Task<LifestylePreferencesDto?> GetLifestylePreferencesAsync(
        Guid userId,
        CancellationToken cancellationToken);

    Task<LifestylePreferencesDto> SaveLifestylePreferencesAsync(
        Guid userId,
        SaveLifestylePreferencesRequest request,
        CancellationToken cancellationToken);
}

// Email is deliberately absent: it identifies an account, not a profile, and the
// discovery list is readable by other members. Callers read their own address
// from GET /api/auth/me.
public sealed record UserProfileDto(
    Guid Id,
    string DisplayName,
    string? Occupation,
    string City,
    string? District,
    string? AvatarUrl,
    bool IsVerified,
    int ProfileCompletion);

public sealed record ProfileDetailDto(
    Guid UserId,
    string DisplayName,
    DateOnly? BirthDate,
    string? Gender,
    string? Occupation,
    string? Bio,
    string City,
    string? District,
    string? AvatarUrl,
    bool IsVerified,
    int ProfileCompletion,
    DateTimeOffset UpdatedAt);

public sealed record UpdateProfileRequest(
    [Required, StringLength(120, MinimumLength = 2)] string DisplayName,
    DateOnly? BirthDate,
    [StringLength(30)] string? Gender,
    [StringLength(120)] string? Occupation,
    [StringLength(2000)] string? Bio,
    [Required, StringLength(100)] string City,
    [StringLength(100)] string? District,
    [StringLength(500), Url] string? AvatarUrl);

public sealed record LifestylePreferencesDto(
    Guid UserId,
    string SleepSchedule,
    int Cleanliness,
    string SocialStyle,
    bool Smoking,
    bool PetFriendly,
    string? CookingFrequency,
    int BudgetMin,
    int BudgetMax,
    DateOnly? MoveInDate,
    IReadOnlyList<string> Interests,
    DateTimeOffset UpdatedAt);

public sealed record SaveLifestylePreferencesRequest(
    [Required, StringLength(40)] string SleepSchedule,
    [Range(1, 5)] int Cleanliness,
    [Required, StringLength(40)] string SocialStyle,
    bool Smoking,
    bool PetFriendly,
    [StringLength(40)] string? CookingFrequency,
    [Range(0, 1_000_000_000)] int BudgetMin,
    [Range(0, 1_000_000_000)] int BudgetMax,
    DateOnly? MoveInDate,
    string[]? Interests) : IValidatableObject
{
    public const int MaxInterests = 20;
    public const int MaxInterestLength = 40;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (BudgetMax < BudgetMin)
        {
            yield return new ValidationResult(
                "Ngân sách tối đa phải lớn hơn hoặc bằng ngân sách tối thiểu.",
                [nameof(BudgetMin), nameof(BudgetMax)]);
        }

        if (Interests is { Length: > MaxInterests })
        {
            yield return new ValidationResult(
                $"Chỉ được chọn tối đa {MaxInterests} sở thích.",
                [nameof(Interests)]);
        }

        if (Interests?.Any(interest => interest.Length > MaxInterestLength) == true)
        {
            yield return new ValidationResult(
                $"Mỗi sở thích tối đa {MaxInterestLength} ký tự.",
                [nameof(Interests)]);
        }
    }
}
