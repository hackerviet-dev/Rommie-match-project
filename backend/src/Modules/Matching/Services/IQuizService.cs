using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace RoomieMatch.Modules.Matching.Services;

public interface IQuizService
{
    QuizDto GetQuiz();

    Task<QuizResultDto?> GetMyResultAsync(Guid userId, CancellationToken cancellationToken);

    // Answering again replaces the previous answers. Errors are keyed by question id.
    Task<QuizSubmitResult> SubmitAsync(
        Guid userId,
        SubmitQuizRequest request,
        CancellationToken cancellationToken);
}

public sealed record QuizDto(string Code, string Title, IReadOnlyList<QuizQuestionDto> Questions);

public sealed record QuizQuestionDto(
    string Id,
    string Text,
    string Emoji,
    IReadOnlyList<QuizOptionDto> Options);

public sealed record QuizOptionDto(string Id, string Text);

// Answers maps question id -> option id, e.g. {"late_dishes": "wash_now"}.
public sealed record SubmitQuizRequest([Required] [property: Description("Object ánh xạ questionId sang optionId; lấy id hợp lệ từ GET /api/matching/quiz và trả lời đủ câu hỏi.")] Dictionary<string, string> Answers);

// Each trait is 0-100. NoiseTolerance feeds the "Chịu ồn" score when the member has not
// picked a room environment in their lifestyle preferences.
public sealed record QuizTraitsDto(
    int NoiseTolerance,
    int Tidiness,
    int EarlyBird,
    string CostSplit);

public sealed record QuizResultDto(
    string Code,
    string Title,
    IReadOnlyDictionary<string, string> Answers,
    QuizTraitsDto Traits,
    IReadOnlyList<string> Tags,
    DateTimeOffset CompletedAt,
    DateTimeOffset UpdatedAt);

public sealed record QuizSubmitResult(
    QuizResultDto? Result,
    IReadOnlyDictionary<string, string[]> Errors);
