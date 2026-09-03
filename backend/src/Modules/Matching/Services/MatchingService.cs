using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Matching.Services;

public sealed class MatchingService(IDbConnectionFactory connectionFactory) : IMatchingService
{
    public object GetModuleStatus()
    {
        return new
        {
            module = "Matching",
            features = new[] { "questionnaire", "compatibility-score", "gemini-worker" }
        };
    }

    public async Task<IReadOnlyList<RoommateMatchDto>> GetMatchesAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT p.user_id, p.display_name,
                   COALESCE(date_part('year', age(current_date, p.birth_date))::int, 0),
                   p.occupation, p.city, p.district, p.avatar_url, p.is_verified,
                   ms.overall_score, ms.breakdown::text, ms.explanation,
                   lp.budget_min, lp.budget_max, array_to_string(lp.interests, '|')
            FROM matching_scores ms
            INNER JOIN profiles p ON p.user_id = ms.candidate_user_id
            INNER JOIN lifestyle_preferences lp ON lp.user_id = ms.candidate_user_id
            WHERE ms.user_id = @user_id
            ORDER BY ms.overall_score DESC
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        var parameter = command.CreateParameter();
        parameter.ParameterName = "user_id";
        parameter.Value = userId;
        command.Parameters.Add(parameter);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var matches = new List<RoommateMatchDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            matches.Add(new RoommateMatchDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetInt32(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.IsDBNull(6) ? null : reader.GetString(6),
                reader.GetBoolean(7),
                reader.GetInt16(8),
                reader.GetString(9),
                reader.IsDBNull(10) ? null : reader.GetString(10),
                reader.GetInt32(11),
                reader.GetInt32(12),
                reader.GetString(13).Split('|', StringSplitOptions.RemoveEmptyEntries)));
        }

        return matches;
    }
}
