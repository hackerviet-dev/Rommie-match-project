using System.Data.Common;
using System.Text.Json;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Matching.Services;

public sealed class QuizService(IDbConnectionFactory connectionFactory) : IQuizService
{
    // camelCase, because MatchingService reads result->'traits'->>'noiseTolerance' in SQL.
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private const string ResultColumns = "answers::text, result::text, completed_at, updated_at";

    public QuizDto GetQuiz()
    {
        return LifestyleQuiz.Describe();
    }

    public async Task<QuizResultDto?> GetMyResultAsync(Guid userId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT {ResultColumns}
            FROM quiz_responses
            WHERE user_id = @user_id AND quiz_code = @quiz_code
            """;
        command
            .AddParameter("user_id", userId)
            .AddParameter("quiz_code", LifestyleQuiz.Code);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadResult(reader) : null;
    }

    public async Task<QuizSubmitResult> SubmitAsync(
        Guid userId,
        SubmitQuizRequest request,
        CancellationToken cancellationToken)
    {
        var answers = request.Answers.ToDictionary(pair => pair.Key, pair => pair.Value?.Trim() ?? string.Empty);
        var errors = LifestyleQuiz.Validate(answers);
        if (errors.Count > 0)
        {
            return new QuizSubmitResult(null, errors);
        }

        var traits = LifestyleQuiz.Evaluate(answers);
        var result = new StoredResult(traits, LifestyleQuiz.Tags(traits));

        // completed_at is the first completion; updated_at (trigger) tracks retakes.
        var sql = $"""
            INSERT INTO quiz_responses (user_id, quiz_code, answers, result)
            VALUES (@user_id, @quiz_code, @answers::jsonb, @result::jsonb)
            ON CONFLICT (user_id, quiz_code) DO UPDATE SET
                answers = EXCLUDED.answers,
                result = EXCLUDED.result
            RETURNING {ResultColumns}
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command
            .AddParameter("user_id", userId)
            .AddParameter("quiz_code", LifestyleQuiz.Code)
            .AddParameter("answers", JsonSerializer.Serialize(answers, JsonOptions))
            .AddParameter("result", JsonSerializer.Serialize(result, JsonOptions));

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return new QuizSubmitResult(ReadResult(reader), errors);
    }

    private static QuizResultDto ReadResult(DbDataReader reader)
    {
        var answers = JsonSerializer.Deserialize<Dictionary<string, string>>(reader.GetString(0), JsonOptions)!;
        var stored = JsonSerializer.Deserialize<StoredResult>(reader.GetString(1), JsonOptions)!;

        return new QuizResultDto(
            LifestyleQuiz.Code,
            LifestyleQuiz.Title,
            answers,
            stored.Traits,
            stored.Tags,
            reader.GetFieldValue<DateTimeOffset>(2),
            reader.GetFieldValue<DateTimeOffset>(3));
    }

    private sealed record StoredResult(QuizTraitsDto Traits, string[] Tags);
}
