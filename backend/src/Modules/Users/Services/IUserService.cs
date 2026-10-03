using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RoomieMatch.Shared.Paging;
using RoomieMatch.Shared.Validation;

namespace RoomieMatch.Modules.Users.Services;

public interface IUserService
{
    object GetModuleStatus();

    Task<PagedResult<UserProfileDto>> GetProfilesAsync(
        Guid viewerId,
        PageQuery paging,
        CancellationToken cancellationToken);

    Task<ProfileDetailDto?> GetProfileAsync(Guid userId, CancellationToken cancellationToken);

    /// Returns null when the profile is missing, disabled, private to this viewer, or hidden
    /// because either member has blocked the other (the owner always sees its own profile).
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

    /// Returns the caller's own onboarding housing needs, or null when the profile is missing.
    /// "Chưa khai" fields come back as null, not as false.
    Task<HousingNeedsDto?> GetHousingNeedsAsync(Guid userId, CancellationToken cancellationToken);

    /// Full-replace upsert of the caller's own housing needs; also null when the profile is missing.
    Task<HousingNeedsDto?> SaveHousingNeedsAsync(
        Guid userId,
        SaveHousingNeedsRequest request,
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
    DateTimeOffset UpdatedAt,
    int? BirthYear = null)
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? OccupationStatus { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? OrganizationName { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? HideOrganization { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? HasRoom { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? OnboardingCompletedAt { get; init; }
    // The submission contains the member's address and private preferences.
    // Only the owner receives it, never another member viewing this profile.
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public OnboardingRequest? Onboarding { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public LifestylePreferencesDto? Lifestyle { get; init; }
}

public sealed record UpdateProfileRequest(
    [Required, StringLength(120, MinimumLength = 2)] [property: Description("Tên hiển thị, bắt buộc, 2-120 ký tự.")] string DisplayName,
    [NotFutureDate] [property: Description("Ngày sinh dạng yyyy-MM-dd, không được ở tương lai; null để xóa. Tuổi hiển thị do backend suy ra từ trường này.")] DateOnly? BirthDate,
    [StringLength(30), Gender] [property: Description("Giới tính: male, female hoặc other; null nếu không muốn tiết lộ. Nhãn cũ nam/nữ/khác vẫn được chấp nhận và tự quy về mã.")] string? Gender,
    [StringLength(120)] [property: Description("Nghề nghiệp, tối đa 120 ký tự; null để xóa giá trị cũ.")] string? Occupation,
    [StringLength(2000)] [property: Description("Giới thiệu bản thân, tối đa 2000 ký tự; null để xóa giá trị cũ.")] string? Bio,
    [Required, StringLength(100)] [property: Description("Tên thành phố, bắt buộc, tối đa 100 ký tự (ví dụ TP.HCM); dùng cho tiêu chí khu vực khi ghép đôi.")] string City,
    [StringLength(100)] [property: Description("Quận/huyện, tối đa 100 ký tự; null để xóa, khi đó điểm khu vực chỉ so thành phố.")] string? District,
    [StringLength(500), Url] [property: Description("URL ảnh đại diện; null để xóa ảnh hiện có. API không nhận file upload.")] string? AvatarUrl);

public sealed record LifestylePreferencesDto(
    [property: Description("UUID chủ sở hữu; luôn là user trong access token, không nhận từ client.")] Guid UserId,
    [property: Description("Giờ ngủ đã lưu; bộ tính điểm hiểu đúng định dạng \"HH:mm–HH:mm\".")] string SleepSchedule,
    [property: Description("Mức độ sạch sẽ từ 1 đến 5.")] int Cleanliness,
    [property: Description("Phong cách giao tiếp đã lưu; bộ tính điểm hiểu ngoại hướng/extrovert, hướng nội/introvert, cân bằng/balanced.")] string SocialStyle,
    [property: Description("true nếu có hút thuốc.")] bool Smoking,
    [property: Description("true nếu chấp nhận sống cùng thú cưng.")] bool PetFriendly,
    [property: Description("Tần suất nấu ăn; chỉ để lưu/hiển thị, không tham gia tính điểm ghép đôi.")] string? CookingFrequency,
    [property: Description("Môi trường phòng: quiet, moderate hoặc lively; null khi chưa chọn, khi đó điểm \"Chịu ồn\" lấy từ trắc nghiệm.")] string? RoomEnvironment,
    [property: Description("Ngân sách tối thiểu mỗi tháng, đơn vị VND (đồng).")] int BudgetMin,
    [property: Description("Ngân sách tối đa mỗi tháng, đơn vị VND (đồng); luôn >= budgetMin.")] int BudgetMax,
    [property: Description("Ngày dự kiến dọn vào dạng yyyy-MM-dd; null nghĩa là linh hoạt.")] DateOnly? MoveInDate,
    [property: Description("Sở thích đã lưu; đã gộp các mục trùng nhau.")] IReadOnlyList<string> Interests,
    [property: Description("Thời điểm lưu gần nhất, ISO 8601.")] DateTimeOffset UpdatedAt,
    [property: Description("Có uống rượu bia; null khi chưa khai.")] bool? Drinking = null,
    [property: Description("Mức độ hướng ngoại đã lưu từ onboarding.")] int? Extroversion = null,
    [property: Description("Khoảng cách mong muốn tới nơi học/làm; null khi chưa khai.")] string? PreferredDistance = null,
    [property: Description("Loại phòng mong muốn; null khi chưa khai.")] string? PreferredRoomType = null);

public sealed record SaveLifestylePreferencesRequest(
    [Required, StringLength(40)] [property: Description("Giờ ngủ dạng \"HH:mm–HH:mm\" (ví dụ 23:00–07:00). Bộ tính điểm tách 2 mốc giờ (dấu –, — hoặc - đều được) và so lệch tối đa 180 phút; giá trị khác định dạng này chỉ được so khớp nguyên văn nên dễ mất điểm.")] string SleepSchedule,
    [Range(1, 5)] [property: Description("Mức độ sạch sẽ, số nguyên từ 1 đến 5 (lệch 1 mức trừ 25 điểm ghép đôi).")] int Cleanliness,
    [Required, StringLength(40)] [property: Description("Phong cách giao tiếp: ngoại hướng/extrovert, hướng nội/introvert hoặc cân bằng/balanced (khớp theo từ khóa, không phân biệt hoa thường); giá trị khác bị coi là \"không xác định\".")] string SocialStyle,
    [property: Description("true nếu có hút thuốc. Kiểu boolean và PUT ghi đè toàn bộ nên bỏ trống trường này sẽ lưu false.")] bool Smoking,
    [property: Description("true nếu chấp nhận sống cùng thú cưng. Bỏ trống sẽ lưu false.")] bool PetFriendly,
    [StringLength(40)] [property: Description("Tần suất nấu ăn, tối đa 40 ký tự; gửi null hoặc bỏ trống để lưu null. Chỉ để hiển thị, không tham gia tính điểm.")] string? CookingFrequency,
    // "Chịu ồn": quiet, moderate or lively. Null leaves the score to the quiz answers.
    [AllowedValues("quiet", "moderate", "lively", null)] [property: Description("Môi trường phòng: quiet (15 điểm chịu ồn), moderate (50) hoặc lively (85); gửi null hoặc bỏ trống để xóa, khi đó điểm lấy từ trắc nghiệm và cả hai đều trống thì tính 50.")] string? RoomEnvironment,
    [Range(0, 1_000_000_000)] [property: Description("Ngân sách tối thiểu mỗi tháng, đơn vị VND (đồng), số nguyên 0-1000000000. PUT ghi đè toàn bộ nên bỏ trống sẽ lưu 0.")] int BudgetMin,
    [Range(0, 1_000_000_000)] [property: Description("Ngân sách tối đa mỗi tháng, đơn vị VND (đồng), số nguyên 0-1000000000 và bắt buộc >= budgetMin; vi phạm trả 400. PUT ghi đè toàn bộ nên bỏ trống sẽ lưu 0.")] int BudgetMax,
    [NotPastDate] [property: Description("Ngày dự kiến dọn vào dạng yyyy-MM-dd, từ hôm nay trở đi theo giờ Việt Nam; null nghĩa là linh hoạt.")] DateOnly? MoveInDate,
    [property: Description("Danh sách sở thích: tối đa 20 mục, mỗi mục tối đa 40 ký tự; phần tử null hoặc chỉ có khoảng trắng bị từ chối với 400. Gửi null hoặc bỏ trống để lưu mảng rỗng; mục trùng nhau được gộp.")] string[]? Interests) : IValidatableObject
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

        // A JSON array can carry null elements (System.Text.Json maps them to null) or blank
        // strings. Left unchecked they would reach string operations and turn a bad request
        // into a 500, so every element must carry content.
        if (Interests?.Any(interest => string.IsNullOrWhiteSpace(interest) || interest.Length > MaxInterestLength) == true)
        {
            yield return new ValidationResult(
                $"Mỗi sở thích phải có nội dung và tối đa {MaxInterestLength} ký tự.",
                [nameof(Interests)]);
        }
    }
}

// Onboarding "housing needs" that had no write path before phase 3. The four circumstance
// fields already live on profiles and the three preference fields on lifestyle_preferences;
// this DTO joins them behind one /me endpoint instead of duplicating storage. All of it is
// private: the discovery list and GET /api/users/{id}/profile never return it.
public sealed record HousingNeedsDto(
    [property: Description("UUID chủ sở hữu; luôn là user trong access token, không nhận từ client.")] Guid UserId,
    [property: Description("Đã có phòng hay đang tìm phòng: true = đã có phòng, false = đang tìm phòng, null = chưa khai (khác hẳn false).")] bool? HasRoom,
    [property: Description("Tình trạng hiện tại: student (đang đi học), employed (đang đi làm), both (cả hai), other (khác) hoặc null nếu chưa khai.")] string? OccupationStatus,
    [property: Description("Tên trường học hoặc nơi làm việc, tối đa 160 ký tự; null khi chưa khai. Không suy ra từ occupation.")] string? OrganizationName,
    [property: Description("true = ẩn tên tổ chức khi hiển thị công khai; false = cho phép hiển thị. Đây là công tắc nên luôn là boolean, không có trạng thái chưa khai.")] bool HideOrganization,
    [property: Description("Có uống rượu bia: true = có, false = không, null = chưa khai.")] bool? Drinking,
    [property: Description("Khoảng cách mong muốn tới nơi học/làm: lt_2km (< 2 km), 2_5km (2–5 km), 5_10km (5–10 km), anywhere (bất kỳ đâu trong thành phố) hoặc null nếu chưa khai.")] string? PreferredDistance,
    [property: Description("Loại phòng muốn tìm: private (phòng riêng), shared (phòng chung), studio, whole_apartment (cả căn hộ) hoặc null nếu chưa khai.")] string? PreferredRoomType);

public sealed record SaveHousingNeedsRequest(
    [property: Description("true = đã có phòng, false = đang tìm phòng, null = chưa khai. Bỏ trống sẽ lưu null, KHÔNG mặc định false.")] bool? HasRoom,
    [StringLength(20), AllowedValues("student", "employed", "both", "other", null)] [property: Description("Tình trạng hiện tại: student, employed, both, other; hoặc null để xóa. Giá trị khác trả 400.")] string? OccupationStatus,
    [StringLength(160)] [property: Description("Tên trường học hoặc nơi làm việc, tối đa 160 ký tự; gửi null hoặc bỏ trống để lưu null. Không suy ra từ occupation và không bắt buộc theo occupationStatus.")] string? OrganizationName,
    [property: Description("true để ẩn tên tổ chức khi hiển thị công khai; bỏ trống lưu false. Không phụ thuộc organizationName.")] bool HideOrganization,
    [property: Description("true = có uống rượu bia, false = không, null = chưa khai; bỏ trống sẽ lưu null (khác hẳn false).")] bool? Drinking,
    [StringLength(20), AllowedValues("lt_2km", "2_5km", "5_10km", "anywhere", null)] [property: Description("Khoảng cách mong muốn: lt_2km, 2_5km, 5_10km, anywhere; hoặc null. Bắt buộc là null khi hasRoom = true, nếu không trả 400.")] string? PreferredDistance,
    [StringLength(20), AllowedValues("private", "shared", "studio", "whole_apartment", null)] [property: Description("Loại phòng muốn tìm: private, shared, studio, whole_apartment; hoặc null. Bắt buộc là null khi hasRoom = true, nếu không trả 400.")] string? PreferredRoomType) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // "Đã có phòng" và "đang tìm phòng" loại trừ nhau: một người đã có phòng không còn
        // khoảng cách hay loại phòng để tìm, nên không cho lưu cả hai nhóm cùng lúc. PUT ghi
        // đè toàn bộ nên chuyển trạng thái (có phòng <-> tìm phòng) luôn thay thế dữ liệu cũ
        // và không để lại dữ liệu tìm phòng mâu thuẫn.
        if (HasRoom == true && (PreferredDistance is not null || PreferredRoomType is not null))
        {
            yield return new ValidationResult(
                "Khi đã có phòng (hasRoom = true) thì preferredDistance và preferredRoomType phải là null.",
                [nameof(PreferredDistance), nameof(PreferredRoomType)]);
        }
    }
}
