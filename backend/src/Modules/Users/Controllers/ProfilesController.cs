using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController]
[Route("api/users")]
public sealed class ProfilesController(IUserService userService) : ControllerBase
{
    // Members only: "Hồ sơ công khai" means visible to people on RoomieMatch, not to
    // anonymous scrapers.
    [Authorize]
    [HttpGet("profiles")]
    public async Task<ActionResult<PagedResult<UserProfileDto>>> GetProfiles(
        [FromQuery] PageQuery paging,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } viewerId)
        {
            return Unauthorized();
        }

        return Ok(await userService.GetProfilesAsync(viewerId, paging, cancellationToken));
    }

    [Authorize]
    [HttpGet("me/profile")]
    public async Task<ActionResult<ProfileDetailDto>> GetMyProfile(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var profile = await userService.GetProfileAsync(userId, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [Authorize]
    [HttpPut("me/profile")]
    public async Task<ActionResult<ProfileDetailDto>> UpdateMyProfile(
        UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var profile = await userService.UpdateProfileAsync(userId, request, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [Authorize]
    [HttpGet("me/lifestyle")]
    public async Task<ActionResult<LifestylePreferencesDto>> GetMyLifestylePreferences(
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var preferences = await userService.GetLifestylePreferencesAsync(userId, cancellationToken);
        return preferences is null ? NotFound() : Ok(preferences);
    }

    [Authorize]
    [HttpPut("me/lifestyle")]
    public async Task<ActionResult<LifestylePreferencesDto>> SaveMyLifestylePreferences(
        SaveLifestylePreferencesRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await userService.SaveLifestylePreferencesAsync(userId, request, cancellationToken));
    }

    [Authorize]
    [HttpGet("{userId:guid}/profile")]
    public async Task<ActionResult<ProfileDetailDto>> GetProfile(
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } viewerId)
        {
            return Unauthorized();
        }

        var profile = await userService.GetVisibleProfileAsync(viewerId, userId, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }
}
