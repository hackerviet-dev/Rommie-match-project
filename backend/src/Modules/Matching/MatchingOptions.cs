namespace RoomieMatch.Modules.Matching;

public sealed class MatchingOptions
{
    public const string SectionName = "Matching";

    // "5 lượt quét/tháng" on the free plan. Premium is unlimited.
    public int FreeScansPerMonth { get; set; } = 5;

    public int BoostDurationMinutes { get; set; } = 30;

    public int BoostsPerMonth { get; set; } = 4;

    // Added to a boosted member's score when ranking other members' lists only. The score
    // shown and the score filters still use the real value, so a boost moves a profile
    // up among similar matches without pushing a poor match to the top.
    public int BoostRankBonus { get; set; } = 15;
}
