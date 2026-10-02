using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Services;

public interface IUserService
{
    object GetModuleStatus();

    Task<PagedResult<UserProfileDto>> GetProfilesAsync(
        Guid viewerId,
        PageQuery paging,
        CancellationToken cancellationToken);

    Task<ProfileDetailDto?> GetProfileAsync(Guid userId, CancellationToken cancellationToken);

    /// Returns null when the profile is missing, disabled, or private to this viewer.
    Task<ProfileDetailDto?> GetVisibleProfileAsync(
        Guid viewerId,
        Guid userId,
        CancellationToken cancellationToken);

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
    [Required, StringLength(120, MinimumLength = 2)] [property: Description("Tên hiển thị, 2-120 ký tự.")] string DisplayName,
    [property: Description("Ngày sinh dạng yyyy-MM-dd; có thể null.")] DateOnly? BirthDate,
    [StringLength(30), Gender] [property: Description("Giới tính: male, female hoặc other; có thể null.")] string? Gender,
    [StringLength(120)] [property: Description("Nghề nghiệp, tối đa 120 ký tự.")] string? Occupation,
    [StringLength(2000)] [property: Description("Giới thiệu bản thân, tối đa 2000 ký tự.")] string? Bio,
    [Required, StringLength(100)] [property: Description("Tên thành phố, ví dụ TP.HCM, tối đa 100 ký tự.")] string City,
    [StringLength(100)] [property: Description("Tên quận/huyện, tối đa 100 ký tự.")] string? District,
    [StringLength(500), Url] [property: Description("URL ảnh đại diện hợp lệ; API không nhận file upload.")] string? AvatarUrl);

public sealed record LifestylePreferencesDto(
    Guid UserId,
    string SleepSchedule,
    int Cleanliness,
    string SocialStyle,
    bool Smoking,
    bool PetFriendly,
    string? CookingFrequency,
    string? RoomEnvironment,
    int BudgetMin,
    int BudgetMax,
    DateOnly? MoveInDate,
    IReadOnlyList<string> Interests,
    DateTimeOffset UpdatedAt);

public sealed record SaveLifestylePreferencesRequest(
    [Required, StringLength(40)] [property: Description("Thói quen giờ ngủ; dùng giá trị thống nhất với dữ liệu ứng dụng, tối đa 40 ký tự.")] string SleepSchedule,
    [Range(1, 5)] [property: Description("Mức độ sạch sẽ từ 1 đến 5.")] int Cleanliness,
    [Required, StringLength(40)] [property: Description("Phong cách giao tiếp/sinh hoạt, tối đa 40 ký tự.")] string SocialStyle,
    [property: Description("true nếu có hút thuốc.")] bool Smoking,
    [property: Description("true nếu chấp nhận sống cùng thú cưng.")] bool PetFriendly,
    [StringLength(40)] [property: Description("Tần suất nấu ăn, tối đa 40 ký tự; có thể null.")] string? CookingFrequency,
    // "Chịu ồn": quiet, moderate or lively. Null leaves the score to the quiz answers.
    [AllowedValues("quiet", "moderate", "lively", null)] [property: Description("Môi trường phòng: quiet, moderate hoặc lively; null để dùng kết quả quiz khi tính chịu ồn.")] string? RoomEnvironment,
    [Range(0, 1_000_000_000)] [property: Description("Ngân sách tối thiểu mỗi tháng, đơn vị VND, 0-1000000000.")] int BudgetMin,
    [Range(0, 1_000_000_000)] [property: Description("Ngân sách tối đa mỗi tháng, đơn vị VND; phải >= budgetMin.")] int BudgetMax,
    [property: Description("Ngày dự kiến dọn vào, dạng yyyy-MM-dd; có thể null.")] DateOnly? MoveInDate,
    [property: Description("Danh sách sở thích, tối đa 20 mục, mỗi mục tối đa 40 ký tự.")] string[]? Interests) : IValidatableObject
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
