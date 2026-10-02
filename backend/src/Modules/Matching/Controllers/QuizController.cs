using System.ComponentModel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Matching.Services;
using RoomieMatch.Shared.Authentication;

namespace RoomieMatch.Modules.Matching.Controllers;

[ApiController]
[Route("api/matching")]
public sealed class QuizController(IQuizService quizService) : ControllerBase
{
    // Public: the landing page links to the quiz before sign-up.
    [EndpointSummary("Lấy bộ câu hỏi trắc nghiệm")]
    [EndpointDescription("API công khai, không cần token, không có parameter/body. 200 trả QuizDto gồm code, title và questions; mỗi question có id, text, emoji và options (id, text). Frontend phải dùng đúng questionId/optionId trong response này để tạo body cho PUT /api/matching/me/quiz; không hard-code danh sách câu hỏi vì server quyết định nội dung và ý nghĩa của từng option.")]
    [ProducesResponseType(typeof(QuizDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("quiz")]
    public ActionResult<QuizDto> GetQuiz()
    {
        return Ok(quizService.GetQuiz());
    }

    [Authorize]
    [EndpointSummary("Lấy kết quả trắc nghiệm của tôi")]
    [EndpointDescription("Cần đăng nhập; không có parameter/body. 200 trả QuizResultDto của chính người gọi (answers, traits, tags, completedAt, updatedAt). 404 nghĩa là tài khoản chưa làm bài này, không phải lỗi hệ thống: frontend nên chuyển người dùng sang màn hình làm bài. traits/tags do server tính từ answers, client chỉ hiển thị.")]
    [ProducesResponseType(404, Description = "Tài khoản chưa làm bài trắc nghiệm này; hãy chuyển sang màn hình làm bài.")]
    [ProducesResponseType(typeof(QuizResultDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me/quiz")]
    public async Task<ActionResult<QuizResultDto>> GetMyResult(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var result = await quizService.GetMyResultAsync(userId, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    // Saving answers does not rescore existing matches; the app calls
    // POST /api/matching/me/recalculate afterwards.
    [Authorize]
    [EndpointSummary("Nộp hoặc làm lại trắc nghiệm")]
    [EndpointDescription("Cần đăng nhập. Body là { \"answers\": { \"<questionId>\": \"<optionId>\" } } với questionId/optionId lấy từ GET /api/matching/quiz; phải trả lời đủ mọi câu trong bộ đề. 200 trả QuizResultDto vừa lưu, giống hệt kết quả của GET /api/matching/me/quiz. Làm lại sẽ thay thế toàn bộ câu trả lời trước đó (không cộng dồn), giữ nguyên completedAt và cập nhật updatedAt. 400 khi thiếu câu, có questionId lạ hoặc optionId không hợp lệ; errors được đánh khóa theo từng câu dạng Answers.<questionId> để frontend tô đỏ đúng câu. Lưu quiz KHÔNG tự tính lại matching: sau khi lưu hãy gọi POST /api/matching/me/recalculate nếu cần cập nhật điểm ghép đôi.")]
    [ProducesResponseType(400, Description = "Thiếu câu trả lời, questionId không tồn tại hoặc optionId không thuộc câu hỏi; errors có khóa Answers.<questionId>.")]
    [ProducesResponseType(typeof(QuizResultDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPut("me/quiz")]
    public async Task<ActionResult<QuizResultDto>> Submit(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] SubmitQuizRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var submitted = await quizService.SubmitAsync(userId, request, cancellationToken);
        if (submitted.Result is null)
        {
            foreach (var (questionId, messages) in submitted.Errors)
            {
                foreach (var message in messages)
                {
                    ModelState.AddModelError($"{nameof(request.Answers)}.{questionId}", message);
                }
            }

            return ValidationProblem(ModelState);
        }

        return Ok(submitted.Result);
    }
}
