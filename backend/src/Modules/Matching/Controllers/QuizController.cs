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
    [HttpGet("quiz")]
    public ActionResult<QuizDto> GetQuiz()
    {
        return Ok(quizService.GetQuiz());
    }

    [Authorize]
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
    [HttpPut("me/quiz")]
    public async Task<ActionResult<QuizResultDto>> Submit(
        SubmitQuizRequest request,
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
