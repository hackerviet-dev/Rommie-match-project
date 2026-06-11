namespace RoomieMatch.Modules.Matching.Services;

public sealed class MatchingService : IMatchingService
{
    public object GetModuleStatus()
    {
        return new
        {
            module = "Matching",
            features = new[] { "questionnaire", "compatibility-score", "gemini-worker" }
        };
    }
}
