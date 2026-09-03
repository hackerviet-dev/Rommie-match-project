using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Users.Services;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController]
[Route("api/users")]
public sealed class ProfilesController(IUserService userService) : ControllerBase
{
    [HttpGet("profiles")]
    public async Task<ActionResult<IReadOnlyList<UserProfileDto>>> GetProfiles(
        CancellationToken cancellationToken)
    {
        return Ok(await userService.GetProfilesAsync(cancellationToken));
    }
}
