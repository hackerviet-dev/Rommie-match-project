using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Matching.Services;

namespace RoomieMatch.Modules.Matching.Controllers;

[ApiController]
[Route("api/matching")]
public sealed class MatchingController : ControllerBase
{
    private static readonly Guid DemoUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");
    private readonly IMatchingService matchingService;

    public MatchingController(IMatchingService matchingService)
    {
        this.matchingService = matchingService;
    }

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
}
