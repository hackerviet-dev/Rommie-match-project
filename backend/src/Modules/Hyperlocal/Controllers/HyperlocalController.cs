using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Hyperlocal.Services;

namespace RoomieMatch.Modules.Hyperlocal.Controllers;

[ApiController]
[Route("api/hyperlocal")]
public sealed class HyperlocalController : ControllerBase
{
    private readonly IHyperlocalService hyperlocalService;

    public HyperlocalController(IHyperlocalService hyperlocalService)
    {
        this.hyperlocalService = hyperlocalService;
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(hyperlocalService.GetModuleStatus());
    }

    [HttpGet("services")]
    public async Task<ActionResult<IReadOnlyList<LocalServiceDto>>> GetServices(
        [FromQuery] string city = "TP.HCM",
        [FromQuery] string? district = null,
        CancellationToken cancellationToken = default)
    {
        return Ok(await hyperlocalService.GetNearbyServicesAsync(city, district, cancellationToken));
    }
}
