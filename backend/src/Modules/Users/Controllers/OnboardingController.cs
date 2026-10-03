using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Authentication;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController, Authorize, Route("api/users/me/onboarding")]
public sealed class OnboardingController(OnboardingService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } id) return Unauthorized();
        return Ok(new { isComplete = await service.IsCompleteAsync(id, cancellationToken) });
    }

    [HttpPut]
    public async Task<IActionResult> Complete(OnboardingRequest request, CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } id) return Unauthorized();
        await service.SaveAsync(id, request, cancellationToken);
        return Ok(new { isComplete = true });
    }
}
