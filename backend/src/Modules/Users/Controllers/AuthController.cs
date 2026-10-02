using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Http;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService, IUserService userService) : ControllerBase
{
    [EndpointSummary("Thông tin module Auth")]
    [EndpointDescription("API công khai, không có parameter hoặc body. Trả thông tin cấu hình cố định của module; không kiểm tra database. Kiểm tra kết nối database bằng GET /health.")]
    [ProducesResponseType(200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(userService.GetModuleStatus());
    }

    [EnableRateLimiting(RateLimitPolicies.Credentials)]
    [EndpointSummary("Đăng ký tài khoản")]
    [EndpointDescription("Dùng cho form đăng ký. Gửi JSON thông tin tài khoản; 200 trả accessToken, refreshToken và user. 400: dữ liệu không hợp lệ; 409: email đã đăng ký; 429: quá nhiều yêu cầu.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(409, Description = "Xung đột trạng thái; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(429, Description = "Quá nhiều yêu cầu; chờ trước khi thử lại.")]
    [ProducesResponseType(typeof(AuthSessionDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("register")]
    public async Task<ActionResult<AuthSessionDto>> Register(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var result = await authService.RegisterAsync(request, cancellationToken);
        return result.Session is null ? Failure(result.Error) : Ok(result.Session);
    }

    [EnableRateLimiting(RateLimitPolicies.Credentials)]
    [EndpointSummary("Đăng nhập bằng email và mật khẩu")]
    [EndpointDescription("Dùng cho form đăng nhập. 200 trả phiên đăng nhập; lưu cả accessToken và refreshToken. 401: sai thông tin; 403: tài khoản bị vô hiệu; 429: quá nhiều yêu cầu.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(401, Description = "Thông tin đăng nhập/token không hợp lệ hoặc đã hết hạn.")]
    [ProducesResponseType(403, Description = "Không đủ quyền hoặc không thỏa điều kiện; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(429, Description = "Quá nhiều yêu cầu; chờ trước khi thử lại.")]
    [ProducesResponseType(typeof(AuthSessionDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("login")]
    public async Task<ActionResult<AuthSessionDto>> Login(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await authService.LoginAsync(request, cancellationToken);
        return result.Session is null ? Failure(result.Error) : Ok(result.Session);
    }

    [EnableRateLimiting(RateLimitPolicies.Credentials)]
    [EndpointSummary("Đổi refresh token lấy phiên mới")]
    [EndpointDescription("Gọi khi access token hết hạn. 200 trả cả access token và refresh token mới; thay token cũ bằng token mới và tránh refresh đồng thời. Token cũ bị vô hiệu; dùng lại token đã đổi có thể thu hồi toàn bộ phiên. 401: token không hợp lệ/hết hạn; 403: tài khoản bị vô hiệu; 429: quá nhiều yêu cầu.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(401, Description = "Thông tin đăng nhập/token không hợp lệ hoặc đã hết hạn.")]
    [ProducesResponseType(403, Description = "Không đủ quyền hoặc không thỏa điều kiện; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(429, Description = "Quá nhiều yêu cầu; chờ trước khi thử lại.")]
    [ProducesResponseType(typeof(AuthSessionDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthSessionDto>> Refresh(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] RefreshRequest request,
        CancellationToken cancellationToken)
    {
        var result = await authService.RefreshAsync(request, cancellationToken);
        return result.Session is null ? Failure(result.Error) : Ok(result.Session);
    }

    [EndpointSummary("Đăng xuất phiên hiện tại")]
    [EndpointDescription("Gửi refreshToken cần thu hồi. Luôn trả 204, không có response body. Frontend xóa token đã lưu.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(204, Description = "Thành công; không có body.")]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] RefreshRequest request, CancellationToken cancellationToken)
    {
        // Always 204: whether the token existed is not something an unauthenticated caller should learn.
        await authService.LogoutAsync(request, cancellationToken);
        return NoContent();
    }

    // Takes effect immediately: the caller's current access token stops working too.
    [Authorize]
    [EndpointSummary("Đăng xuất tất cả thiết bị")]
    [EndpointDescription("Cần Bearer access token. Không có body. 204: thu hồi toàn bộ phiên, kể cả access token hiện tại; frontend xóa token và quay về đăng nhập.")]
    [ProducesResponseType(204, Description = "Thành công; không có body.")]
    [HttpPost("logout-all")]
    public async Task<IActionResult> LogoutEverywhere(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        await authService.LogoutEverywhereAsync(userId, cancellationToken);
        return NoContent();
    }

    [Authorize]
    [EndpointSummary("Lấy tài khoản đang đăng nhập")]
    [EndpointDescription("Cần Bearer access token. Không có parameter hoặc body. 200 trả AuthenticatedUserDto; 401: phiên không hợp lệ.")]
    [ProducesResponseType(401, Description = "Thông tin đăng nhập/token không hợp lệ hoặc đã hết hạn.")]
    [ProducesResponseType(typeof(AuthenticatedUserDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
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
