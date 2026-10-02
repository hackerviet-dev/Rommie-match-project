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

public sealed record QuizDto(
    [property: Description("Mã bộ câu hỏi; hiện tại là lifestyle_v1 và đổi mã khi nội dung câu hỏi thay đổi ý nghĩa.")] string Code,
    [property: Description("Tiêu đề bộ câu hỏi để hiển thị.")] string Title,
    [property: Description("Danh sách câu hỏi theo thứ tự hiển thị.")] IReadOnlyList<QuizQuestionDto> Questions);

public sealed record QuizQuestionDto(
    [property: Description("ID câu hỏi; dùng làm key trong answers khi nộp bài.")] string Id,
    [property: Description("Nội dung câu hỏi.")] string Text,
    [property: Description("Emoji minh họa cho câu hỏi.")] string Emoji,
    [property: Description("Các lựa chọn của câu hỏi; value của answers phải là id của một option trong đây.")] IReadOnlyList<QuizOptionDto> Options);

public sealed record QuizOptionDto(
    [property: Description("ID lựa chọn; gửi làm value trong answers.")] string Id,
    [property: Description("Nhãn hiển thị của lựa chọn.")] string Text);

// Answers maps question id -> option id, e.g. {"late_dishes": "wash_now"}.
public sealed record SubmitQuizRequest([Required] [property: Description("Object ánh xạ questionId sang optionId; lấy id hợp lệ từ GET /api/matching/quiz và trả lời đủ câu hỏi.")] Dictionary<string, string> Answers);

// Each trait is 0-100. NoiseTolerance feeds the "Chịu ồn" score when the member has not
// picked a room environment in their lifestyle preferences.
public sealed record QuizTraitsDto(
    [property: Description("Mức chịu ồn 0-100 do server tính từ answers; 100 là thoải mái với nhà náo nhiệt. Chỉ dùng cho tiêu chí \"Chịu ồn\" khi thành viên chưa chọn roomEnvironment.")] int NoiseTolerance,
    [property: Description("Mức gọn gàng 0-100 do server tính từ answers; 100 là luôn dọn ngay.")] int Tidiness,
    [property: Description("Mức dậy sớm 0-100 do server tính từ answers; 100 là dậy rất sớm.")] int EarlyBird,
    [property: Description("ID option của câu hỏi chia chi phí chung, ví dụ split_evenly; không tham gia tính điểm.")] string CostSplit);

public sealed record QuizResultDto(
    [property: Description("Mã bộ câu hỏi đã làm; hiện tại là lifestyle_v1.")] string Code,
    [property: Description("Tiêu đề bộ câu hỏi.")] string Title,
    [property: Description("Câu trả lời đã lưu, ánh xạ questionId sang optionId; đúng bằng body của lần nộp gần nhất.")] IReadOnlyDictionary<string, string> Answers,
    [property: Description("Chỉ số do server tính từ answers; đây là giá trị matching dùng, client không tự tính lại.")] QuizTraitsDto Traits,
    [property: Description("Nhãn tính cách ngắn do server sinh từ traits, ví dụ \"Thích yên tĩnh\".")] IReadOnlyList<string> Tags,
    [property: Description("Thời điểm hoàn thành lần đầu; giữ nguyên khi làm lại.")] DateTimeOffset CompletedAt,
    [property: Description("Thời điểm lưu gần nhất; bằng completedAt ở lần nộp đầu và được cập nhật mỗi lần làm lại.")] DateTimeOffset UpdatedAt);

public sealed record QuizSubmitResult(
    QuizResultDto? Result,
    IReadOnlyDictionary<string, string[]> Errors);
