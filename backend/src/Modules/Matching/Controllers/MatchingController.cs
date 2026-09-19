using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Matching.Services;
using RoomieMatch.Shared.Authentication;

namespace RoomieMatch.Modules.Matching.Controllers;

[ApiController]
[Route("api/matching")]
public sealed class MatchingController(IMatchingService matchingService) : ControllerBase
{
    private static readonly Guid DemoUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(matchingService.GetModuleStatus());
    }

    [HttpGet("matches")]
    public async Task<ActionResult<IReadOnlyList<RoommateMatchDto>>> GetMatches(
        [FromQuery] Guid? userId,
        CancellationToken cancellationToken)
    {
        return Ok(await matchingService.GetMatchesAsync(
            userId ?? DemoUserId,
            cancellationToken));
    }

    [Authorize]
    [HttpPost("me/recalculate")]
    public async Task<ActionResult<MatchRecalculationResult>> Recalculate(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var result = await matchingService.RecalculateAsync(userId, cancellationToken);
        if (result is null)
        {
            return Problem(
                "Bạn cần lưu thông tin lối sống trước khi tính độ hợp.",
                statusCode: StatusCodes.Status409Conflict);
        }

        return Ok(result);
    }
}
