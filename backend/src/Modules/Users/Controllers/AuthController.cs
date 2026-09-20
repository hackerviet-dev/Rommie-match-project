using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Authentication;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService, IUserService userService) : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(userService.GetModuleStatus());
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthSessionDto>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var result = await authService.RegisterAsync(request, cancellationToken);
        return result.Session is null ? Failure(result.Error) : Ok(result.Session);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthSessionDto>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await authService.LoginAsync(request, cancellationToken);
        return result.Session is null ? Failure(result.Error) : Ok(result.Session);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthSessionDto>> Refresh(
        RefreshRequest request,
        CancellationToken cancellationToken)
    {
        var result = await authService.RefreshAsync(request, cancellationToken);
        return result.Session is null ? Failure(result.Error) : Ok(result.Session);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken cancellationToken)
    {
        // Always 204: whether the token existed is not something an unauthenticated caller should learn.
        await authService.LogoutAsync(request, cancellationToken);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<AuthenticatedUserDto>> Me(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var user = await authService.GetAuthenticatedUserAsync(userId, cancellationToken);
        return user is null ? Unauthorized() : Ok(user);
    }

    private ObjectResult Failure(AuthError error)
    {
        return error switch
        {
            AuthError.EmailAlreadyRegistered => Problem(
                "Email này đã được đăng ký.",
                statusCode: StatusCodes.Status409Conflict),
            AuthError.AccountDisabled => Problem(
                "Tài khoản đã bị vô hiệu hoá.",
                statusCode: StatusCodes.Status403Forbidden),
            AuthError.InvalidRefreshToken => Problem(
                "Refresh token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
                statusCode: StatusCodes.Status401Unauthorized),
            _ => Problem(
                "Email hoặc mật khẩu không đúng.",
                statusCode: StatusCodes.Status401Unauthorized)
        };
    }
}
