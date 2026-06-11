using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Users.Services;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IUserService userService;

    public AuthController(IUserService userService)
    {
        this.userService = userService;
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(userService.GetModuleStatus());
    }
}
