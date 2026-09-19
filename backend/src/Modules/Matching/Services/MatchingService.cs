using System.Data.Common;
using System.Text.Json;
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
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        return await ReadMatchesAsync(connection, userId, cancellationToken);
    }

    public async Task<MatchRecalculationResult?> RecalculateAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);

        var snapshots = await LoadSnapshotsAsync(connection, userId, cancellationToken);
        var me = snapshots.SingleOrDefault(snapshot => snapshot.UserId == userId);
        if (me is null)
        {
            return null;
        }

        var candidates = snapshots.Where(snapshot => snapshot.UserId != userId).ToArray();
        if (candidates.Length == 0)
        {
            return new MatchRecalculationResult(0, []);
        }

        // Scores are symmetric, so store both directions and keep the candidate's list fresh too.
        var rows = candidates
            .Select(candidate => (Candidate: candidate, Score: CompatibilityScorer.Score(me, candidate)))
            .SelectMany(pair => new[]
            {
                (UserId: userId, CandidateId: pair.Candidate.UserId, pair.Score),
                (UserId: pair.Candidate.UserId, CandidateId: userId, pair.Score)
            })
            .ToArray();

        var values = string.Join(
            ",\n    ",
            rows.Select((_, index) =>
                $"(@user_{index}, @candidate_{index}, @score_{index}, @breakdown_{index}::jsonb, @explanation_{index}, now())"));

        var sql = $"""
            INSERT INTO matching_scores
                (user_id, candidate_user_id, overall_score, breakdown, explanation, calculated_at)
            VALUES
                {values}
            ON CONFLICT (user_id, candidate_user_id) DO UPDATE SET
                overall_score = EXCLUDED.overall_score,
                breakdown = EXCLUDED.breakdown,
                explanation = EXCLUDED.explanation,
                calculated_at = now()
            """;

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        for (var index = 0; index < rows.Length; index++)
        {
            var (rowUserId, candidateId, score) = rows[index];
            command
                .AddParameter($"user_{index}", rowUserId)
                .AddParameter($"candidate_{index}", candidateId)
                .AddParameter($"score_{index}", score.Overall)
                .AddParameter($"breakdown_{index}", JsonSerializer.Serialize(score.Breakdown))
                .AddParameter($"explanation_{index}", score.Explanation);
        }

        await command.ExecuteNonQueryAsync(cancellationToken);

        return new MatchRecalculationResult(
            candidates.Length,
            await ReadMatchesAsync(connection, userId, cancellationToken));
    }

    private static async Task<LifestyleSnapshot[]> LoadSnapshotsAsync(
        DbConnection connection,
        Guid userId,
        CancellationToken cancellationToken)
    {
        // The caller is always included so the service can tell "no preferences saved"
        // apart from "no candidates at all".
        const string sql = """
            SELECT lp.user_id, p.city, p.district, lp.sleep_schedule, lp.cleanliness,
                   lp.social_style, lp.smoking, lp.pet_friendly, lp.budget_min, lp.budget_max,
                   lp.move_in_date, lp.interests
            FROM lifestyle_preferences lp
            INNER JOIN users u ON u.id = lp.user_id
            INNER JOIN profiles p ON p.user_id = lp.user_id
            WHERE u.is_active = true
              AND (lp.user_id = @user_id OR u.role = 'member')
            """;

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("user_id", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var snapshots = new List<LifestyleSnapshot>();
        while (await reader.ReadAsync(cancellationToken))
        {
            snapshots.Add(new LifestyleSnapshot(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.GetString(3),
                reader.GetInt16(4),
                reader.GetString(5),
                reader.GetBoolean(6),
                reader.GetBoolean(7),
                reader.GetInt32(8),
                reader.GetInt32(9),
                reader.IsDBNull(10) ? null : reader.GetFieldValue<DateOnly>(10),
                reader.GetFieldValue<string[]>(11)));
        }

        return [.. snapshots];
    }

    private static async Task<IReadOnlyList<RoommateMatchDto>> ReadMatchesAsync(
        DbConnection connection,
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

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("user_id", userId);

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
