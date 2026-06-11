using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Matching.Services;

namespace RoomieMatch.Modules.Matching.Controllers;

[ApiController]
[Route("api/matching")]
public sealed class MatchingController : ControllerBase
{
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
}
