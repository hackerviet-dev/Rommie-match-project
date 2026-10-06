using System.ComponentModel.DataAnnotations;
using System.Globalization;
using RoomieMatch.Shared.Validation;

namespace RoomieMatch.Modules.Users.Services;

public sealed class OnboardingRequest : IValidatableObject
{
    public string Name { get; set; } = "";
    public string Age { get; set; } = "";
    public string Gender { get; set; } = "";
    public string Employment { get; set; } = "";
    public string OrgName { get; set; } = "";
    public bool HideOrg { get; set; }
    public string City { get; set; } = "";
    public string Bio { get; set; } = "";
    public string Sleep { get; set; } = "";
    public string Env { get; set; } = "";
    public Dictionary<string, string> Yn { get; set; } = new();
    public int Cleanliness { get; set; } = 4;
    public int Extroversion { get; set; } = 60;
    public int BudgetMin { get; set; } = 3;
    public int BudgetMax { get; set; } = 7;
    public string HasRoom { get; set; } = "";
    // Empty retains the existing contract for older clients that submit room details.
    public string RoomAction { get; set; } = "";
    // Optional for legacy clients; a declared poster type must be valid and have a room.
    public string RoomPosterType { get; set; } = "";
    [System.Text.Json.Serialization.JsonIgnore]
    public bool DefersRoomDetails => HasRoom == "yes" && RoomAction is "explore" or "post_room";
    public string Addr { get; set; } = "";
    [StringLength(100)] public string RoomCity { get; set; } = "";
    [Range(-90d, 90d)] public double? Latitude { get; set; }
    [Range(-180d, 180d)] public double? Longitude { get; set; }
    public string District { get; set; } = "";
    public string Bedrooms { get; set; } = "";
    public string Area { get; set; } = "";
    public string Rent { get; set; } = "";
    public string Needed { get; set; } = "";
    public string MoveIn { get; set; } = "";
    public string HouseType { get; set; } = "";
    public string Distance { get; set; } = "";
    public string RoomType { get; set; } = "";
    public string MoveInDate { get; set; } = "";
    public string[] Amenities { get; set; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        var errors = new List<ValidationResult>();
        if (Latitude is null != Longitude is null) errors.Add(new("Cần đủ cả hai tọa độ.", [nameof(Latitude), nameof(Longitude)]));
        void Check(bool valid, string field) { if (!valid) errors.Add(new("Thông tin onboarding không hợp lệ.", new[] { field })); }
        bool Text(string? value, int max) => !string.IsNullOrWhiteSpace(value) && value.Length <= max;
        bool Choice(string? value, params string[] choices) => choices.Contains(value);
        bool Positive(string? value, bool integer = false) => decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var n) && n > 0 && n <= 1000000000 && (!integer || decimal.Truncate(n) == n);
        void CheckMoveInDate(string? value, string field)
        {
            if (!DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                errors.Add(new("Vui lòng nhập ngày hợp lệ theo định dạng yyyy-MM-dd.", new[] { field }));
            else if (date < DateRules.Today)
                errors.Add(new("Ngày dọn vào phải từ hôm nay trở đi.", new[] { field }));
        }
        Check(Text(Name, 120) && Name.Trim().Length >= 2, nameof(Name));
        if (!int.TryParse(Age, out var age) || age < 18 || age > 120)
            errors.Add(new("Tuổi phải là số nguyên từ 18 đến 120.", new[] { nameof(Age) }));
        Check(Choice(Gender, "Nam", "Nữ", "Khác", "Không muốn tiết lộ"), nameof(Gender));
        Check(Text(City, 100), nameof(City));
        Check(Choice(Employment, "Đang đi học", "Đang đi làm", "Cả hai", "Khác"), nameof(Employment));
        if (OrgName is null || OrgName.Length > 160)
            errors.Add(new("Tên trường học hoặc nơi làm việc tối đa 160 ký tự.", new[] { nameof(OrgName) }));
        else if (Employment != "Khác" && string.IsNullOrWhiteSpace(OrgName))
            errors.Add(new("Vui lòng nhập trường học hoặc nơi làm việc.", new[] { nameof(OrgName) }));
        if (Bio is null || Bio.Length > 500)
            errors.Add(new("Giới thiệu bản thân tối đa 500 ký tự.", new[] { nameof(Bio) }));
        Check(Choice(Sleep, "Trước 22h", "22h–0h", "Sau 0h"), nameof(Sleep));
        Check(Choice(Env, "Yên tĩnh", "Vừa phải", "Sôi nổi"), nameof(Env));
        foreach (var key in new[] { "smoke", "drink", "pets" })
            Check(Yn is not null && Yn.TryGetValue(key, out var answer) && Choice(answer, "Có", "Không"), key);
        Check(Cleanliness is >= 1 and <= 5, nameof(Cleanliness));
        Check(Extroversion is >= 0 and <= 100, nameof(Extroversion));
        Check(BudgetMin >= 1 && BudgetMax >= BudgetMin && BudgetMax <= 15, nameof(BudgetMax));
        Check(Amenities is not null && Amenities.Length <= 50 && Amenities.All(a => Text(a, 120)), nameof(Amenities));
        Check(Choice(HasRoom, "yes", "no"), nameof(HasRoom));
        Check(Choice(RoomAction, "", "explore", "post_room"), nameof(RoomAction));
        Check(HasRoom == "yes" || string.IsNullOrEmpty(RoomAction), nameof(RoomAction));
        if (RoomPosterType == "landlord_agent")
            errors.Add(new("Hệ thống chưa hỗ trợ Chủ nhà / Môi giới.", [nameof(RoomPosterType)]));
        else Check(HasRoom == "yes" ? RoomPosterType == "resident" : string.IsNullOrEmpty(RoomPosterType), nameof(RoomPosterType));
        Check(HasRoom == "yes" || string.IsNullOrEmpty(RoomPosterType), nameof(RoomPosterType));
        if (HasRoom == "yes" && !DefersRoomDetails)
        {
            Check(Text(Addr, 500), nameof(Addr));
            Check(Text(District, 100), nameof(District));
            Check(Positive(Bedrooms, true), nameof(Bedrooms));
            Check(Positive(Area), nameof(Area));
            Check(Rent is not null && System.Text.RegularExpressions.Regex.IsMatch(Rent, @"^(?:\d+|\d{1,3}(?:[.,]\d{3})+)$") && Positive(Rent.Replace(".", "").Replace(",", "")), nameof(Rent));
            Check(Needed == "1", nameof(Needed));
            CheckMoveInDate(MoveIn, nameof(MoveIn));
            Check(Choice(HouseType, "Căn hộ", "Nhà nguyên căn", "Studio", "Ký túc xá"), nameof(HouseType));
        }
        else if (HasRoom == "no")
        {
            Check(Choice(Distance, "< 2 km", "2–5 km", "5–10 km", "Bất kỳ đâu trong thành phố"), nameof(Distance));
            Check(Choice(RoomType, "Phòng riêng", "Phòng chung", "Studio", "Cả căn hộ"), nameof(RoomType));
            CheckMoveInDate(MoveInDate, nameof(MoveInDate));
        }
        return errors;
    }
}
