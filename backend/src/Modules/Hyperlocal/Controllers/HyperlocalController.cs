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
}
