using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Matching.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Matching.Controllers;

[ApiController]
[Route("api/matching")]
public sealed class MatchingController(IMatchingService matchingService) : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(matchingService.GetModuleStatus());
    }

    // Always the caller's own list: whose matches to read comes from the token, never
    // from the request, so one member cannot read another member's matches.
    [Authorize]
    [HttpGet("me/matches")]
    public async Task<ActionResult<PagedResult<RoommateMatchDto>>> GetMyMatches(
        [FromQuery] PageQuery paging,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await matchingService.GetMatchesAsync(userId, paging, cancellationToken));
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
