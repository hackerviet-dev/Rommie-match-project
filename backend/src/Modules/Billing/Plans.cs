namespace RoomieMatch.Modules.Billing;

public sealed record PlanDto(
    string Code,
    string Name,
    string Tier,
    int Price,
    string Currency,
    int DurationMonths,
    IReadOnlyList<string> Features);

// Prices live on the server only; checkout never accepts an amount from the client.
public static class Plans
{
    public const string Free = "free";
    public const string PremiumMonthly = "premium_monthly";
    public const string PremiumYearly = "premium_yearly";

    public static readonly IReadOnlyList<PlanDto> All =
    [
        new(Free, "Miễn phí", "free", 0, "VND", 0,
        [
            "Ghép đôi cơ bản",
            "Trò chuyện trong ứng dụng",
            "5 lượt quét/tháng",
            "Bộ lọc tiêu chuẩn"
        ]),
        new(PremiumMonthly, "Premium tháng", "premium", 20_000, "VND", 1,
        [
            "Phân tích hợp nhau nâng cao",
            "Quét hợp nhau không giới hạn",
            "Bộ lọc nâng cao",
            "Xem ai đã xem bạn",
            "Boost hồ sơ — xem gấp 5 lần"
        ]),
        new(PremiumYearly, "Premium năm", "premium", 180_000, "VND", 12,
        [
            "Tất cả tính năng Premium tháng",
            "Quét hợp nhau không giới hạn",
            "Bộ lọc nâng cao theo khu vực và lối sống",
            "Ưu tiên hiển thị cả năm",
            "Boost hồ sơ định kỳ"
        ])
    ];

    public static PlanDto? FindPurchasable(string code)
    {
        return All.FirstOrDefault(plan => plan.Code == code && plan.Price > 0);
    }
}
