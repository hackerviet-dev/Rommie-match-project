namespace RoomieMatch.Modules.Matching.Services;

internal sealed record LifestyleSnapshot(
    Guid UserId,
    string City,
    string? District,
    string SleepSchedule,
    int Cleanliness,
    string SocialStyle,
    bool Smoking,
    bool PetFriendly,
    int BudgetMin,
    int BudgetMax,
    DateOnly? MoveInDate,
    string[] Interests);

internal sealed record CompatibilityScore(
    short Overall,
    IReadOnlyDictionary<string, int> Breakdown,
    string Explanation);

internal static class CompatibilityScorer
{
    private const int MinutesPerDay = 24 * 60;

    // Sleep and wake times this far apart score zero; anything closer scales linearly.
    private const double SleepToleranceMinutes = 180;

    // Move-in dates this many days apart score zero.
    private const double TimingToleranceDays = 90;

    private static readonly Dictionary<string, string> Labels = new()
    {
        ["sleep"] = "giờ giấc sinh hoạt",
        ["cleanliness"] = "mức độ gọn gàng",
        ["budget"] = "ngân sách",
        ["location"] = "khu vực",
        ["social"] = "phong cách giao tiếp",
        ["lifestyle"] = "thói quen sinh hoạt",
        ["interests"] = "sở thích",
        ["timing"] = "thời điểm chuyển vào"
    };

    public static CompatibilityScore Score(LifestyleSnapshot a, LifestyleSnapshot b)
    {
        (string Key, int Weight, int Value)[] components =
        [
            ("sleep", 16, ScoreSleep(a.SleepSchedule, b.SleepSchedule)),
            ("cleanliness", 16, ScoreCleanliness(a.Cleanliness, b.Cleanliness)),
            ("budget", 16, ScoreBudget(a, b)),
            ("location", 20, ScoreLocation(a, b)),
            ("social", 12, ScoreSocial(a.SocialStyle, b.SocialStyle)),
            ("lifestyle", 8, ScoreHabits(a, b)),
            ("interests", 6, ScoreInterests(a.Interests, b.Interests)),
            ("timing", 6, ScoreTiming(a.MoveInDate, b.MoveInDate))
        ];

        var overall = Clamp((int)Math.Round(components.Sum(c => (double)c.Value * c.Weight) / 100.0));

        return new CompatibilityScore(
            (short)overall,
            components.ToDictionary(c => c.Key, c => c.Value),
            BuildExplanation(components));
    }

    private static int ScoreSleep(string a, string b)
    {
        if (TryParseSchedule(a, out var aStart, out var aEnd)
            && TryParseSchedule(b, out var bStart, out var bEnd))
        {
            var difference = (CircularDifference(aStart, bStart) + CircularDifference(aEnd, bEnd)) / 2.0;
            return Clamp(100 - (int)Math.Round(difference / SleepToleranceMinutes * 100));
        }

        return string.Equals(a.Trim(), b.Trim(), StringComparison.OrdinalIgnoreCase) ? 85 : 50;
    }

    private static int ScoreCleanliness(int a, int b)
    {
        return Clamp(100 - (Math.Abs(a - b) * 25));
    }

    private static int ScoreSocial(string a, string b)
    {
        var styleA = ClassifySocial(a);
        var styleB = ClassifySocial(b);

        if (styleA is SocialStyle.Unknown || styleB is SocialStyle.Unknown)
        {
            return string.Equals(a.Trim(), b.Trim(), StringComparison.OrdinalIgnoreCase) ? 100 : 60;
        }

        if (styleA == styleB)
        {
            return 100;
        }

        return styleA is SocialStyle.Balanced || styleB is SocialStyle.Balanced ? 75 : 40;
    }

    private static int ScoreBudget(LifestyleSnapshot a, LifestyleSnapshot b)
    {
        var overlap = Math.Min(a.BudgetMax, b.BudgetMax) - Math.Max(a.BudgetMin, b.BudgetMin);
        if (overlap >= 0)
        {
            var narrowestRange = Math.Min(a.BudgetMax - a.BudgetMin, b.BudgetMax - b.BudgetMin);
            return narrowestRange <= 0 ? 100 : Clamp((int)Math.Round(100.0 * overlap / narrowestRange));
        }

        // Ranges do not meet: penalise the gap relative to what the two are willing to pay,
        // so the scale works regardless of the market's price level.
        var midpoint = (a.BudgetMin + a.BudgetMax + b.BudgetMin + b.BudgetMax) / 4.0;
        return midpoint <= 0 ? 0 : Clamp((int)Math.Round(100 - (200.0 * -overlap / midpoint)));
    }

    private static int ScoreLocation(LifestyleSnapshot a, LifestyleSnapshot b)
    {
        if (!string.Equals(a.City.Trim(), b.City.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return 0;
        }

        if (string.IsNullOrWhiteSpace(a.District) || string.IsNullOrWhiteSpace(b.District))
        {
            return 85;
        }

        return string.Equals(a.District.Trim(), b.District.Trim(), StringComparison.OrdinalIgnoreCase)
            ? 100
            : 80;
    }

    private static int ScoreHabits(LifestyleSnapshot a, LifestyleSnapshot b)
    {
        var smoking = a.Smoking == b.Smoking ? 100 : 20;
        var pets = a.PetFriendly == b.PetFriendly ? 100 : 50;
        return (int)Math.Round((smoking * 0.6) + (pets * 0.4));
    }

    private static int ScoreInterests(string[] a, string[] b)
    {
        if (a.Length == 0 || b.Length == 0)
        {
            return 50;
        }

        var shared = a.Intersect(b, StringComparer.OrdinalIgnoreCase).Count();
        return Clamp((int)Math.Round(100.0 * shared / Math.Min(a.Length, b.Length)));
    }

    private static int ScoreTiming(DateOnly? a, DateOnly? b)
    {
        if (a is null || b is null)
        {
            return 50;
        }

        var days = Math.Abs(a.Value.DayNumber - b.Value.DayNumber);
        return Clamp(100 - (int)Math.Round(days / TimingToleranceDays * 100));
    }

    private static string BuildExplanation((string Key, int Weight, int Value)[] components)
    {
        var ranked = components
            .OrderByDescending(c => c.Value)
            .ThenByDescending(c => c.Weight)
            .ToArray();

        var strengths = ranked.Take(2).Where(c => c.Value >= 70).Select(c => Labels[c.Key]).ToArray();
        var sentence = strengths.Length switch
        {
            2 => $"Hợp nhau về {strengths[0]} và {strengths[1]}.",
            1 => $"Hợp nhau về {strengths[0]}.",
            _ => "Mức độ tương đồng chưa cao ở hầu hết tiêu chí."
        };

        // Surface the heaviest weak spot, not the lowest score: a weak but lightly
        // weighted dimension is not what actually drags the match down.
        var weakest = components
            .Where(c => c.Value < 50)
            .OrderByDescending(c => c.Weight)
            .ThenBy(c => c.Value)
            .FirstOrDefault();

        return weakest.Key is null
            ? sentence
            : $"{sentence} Cần trao đổi thêm về {Labels[weakest.Key]}.";
    }

    private static bool TryParseSchedule(string schedule, out int startMinutes, out int endMinutes)
    {
        startMinutes = 0;
        endMinutes = 0;

        var parts = schedule.Split(['–', '—', '-'], StringSplitOptions.TrimEntries);
        return parts.Length == 2
            && TryParseMinutes(parts[0], out startMinutes)
            && TryParseMinutes(parts[1], out endMinutes);
    }

    private static bool TryParseMinutes(string value, out int minutes)
    {
        if (TimeOnly.TryParse(value, out var time))
        {
            minutes = (time.Hour * 60) + time.Minute;
            return true;
        }

        minutes = 0;
        return false;
    }

    private static int CircularDifference(int a, int b)
    {
        var difference = Math.Abs(a - b) % MinutesPerDay;
        return Math.Min(difference, MinutesPerDay - difference);
    }

    private static SocialStyle ClassifySocial(string value)
    {
        var normalized = value.Trim().ToLowerInvariant();

        if (normalized.Contains("ngoại") || normalized.Contains("extrovert"))
        {
            return SocialStyle.Extrovert;
        }

        if (normalized.Contains("nội") || normalized.Contains("introvert"))
        {
            return SocialStyle.Introvert;
        }

        if (normalized.Contains("cân bằng") || normalized.Contains("balanced"))
        {
            return SocialStyle.Balanced;
        }

        return SocialStyle.Unknown;
    }

    private static int Clamp(int value)
    {
        return Math.Clamp(value, 0, 100);
    }

    private enum SocialStyle
    {
        Unknown,
        Introvert,
        Balanced,
        Extrovert
    }
}
