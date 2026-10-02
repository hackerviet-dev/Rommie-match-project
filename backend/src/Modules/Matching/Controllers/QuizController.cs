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
    [EndpointDescription("API công khai; không có parameter/body. 200 trả QuizDto với questions/options. Dùng id từ response để tạo answers khi nộp bài.")]
    [ProducesResponseType(typeof(QuizDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("quiz")]
    public ActionResult<QuizDto> GetQuiz()
    {
        return Ok(quizService.GetQuiz());
    }

    [Authorize]
    [EndpointSummary("Lấy kết quả trắc nghiệm của tôi")]
    [EndpointDescription("Cần đăng nhập. 200 trả QuizResultDto; 404: chưa làm bài.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
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
    [EndpointDescription("Cần đăng nhập. Gửi answers ánh xạ questionId sang optionId lấy từ GET /api/matching/quiz. 200 trả QuizResultDto; làm lại ghi đè bài cũ. 400 trả lỗi theo câu hỏi. Sau khi lưu, gọi POST /api/matching/me/recalculate để cập nhật điểm ghép đôi.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
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
