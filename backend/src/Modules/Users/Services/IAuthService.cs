using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace RoomieMatch.Modules.Users.Services;

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<AuthResult> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken);
    Task LogoutAsync(RefreshRequest request, CancellationToken cancellationToken);

    /// Revokes every refresh token and every access token already issued to the user.
    Task LogoutEverywhereAsync(Guid userId, CancellationToken cancellationToken);
    Task<AuthenticatedUserDto?> GetAuthenticatedUserAsync(Guid userId, CancellationToken cancellationToken);
}

public enum AuthError
{
    None,
    EmailAlreadyRegistered,
    InvalidCredentials,
    AccountDisabled,
    InvalidRefreshToken
}

public sealed record AuthResult(AuthError Error, AuthSessionDto? Session)
{
    public static AuthResult Success(AuthSessionDto session) => new(AuthError.None, session);

    public static AuthResult Failure(AuthError error) => new(error, null);
}

public sealed record RegisterRequest(
    [Required, EmailAddress, StringLength(320)] [property: Description("Email đăng nhập hợp lệ, tối đa 320 ký tự.")] string Email,
    [Required, StringLength(200, MinimumLength = 8)] [property: Description("Mật khẩu; khi đăng ký phải có 8-200 ký tự.")] string Password,
    [Required, StringLength(120, MinimumLength = 2)] [property: Description("Tên hiển thị, 2-120 ký tự.")] string DisplayName,
    [Required, StringLength(100)] [property: Description("Tên thành phố, ví dụ TP.HCM, tối đa 100 ký tự.")] string City,
    [StringLength(100)] [property: Description("Tên quận/huyện, tối đa 100 ký tự.")] string? District,
    [property: Description("Ngày sinh dạng yyyy-MM-dd; có thể null.")] DateOnly? BirthDate,
    [StringLength(30), Gender] [property: Description("Giới tính: male, female hoặc other; có thể null.")] string? Gender,
    [StringLength(120)] [property: Description("Nghề nghiệp, tối đa 120 ký tự.")] string? Occupation);

public sealed record LoginRequest(
    [Required, EmailAddress, StringLength(320)] [property: Description("Email đăng nhập hợp lệ, tối đa 320 ký tự.")] string Email,
    [Required] [property: Description("Mật khẩu; khi đăng ký phải có 8-200 ký tự.")] string Password);

public sealed record RefreshRequest(
    [Required, StringLength(500)] [property: Description("Refresh token từ phiên đăng nhập; khi refresh thành công phải thay bằng token mới.")] string RefreshToken);

public sealed record AuthSessionDto(
    string AccessToken,
    string TokenType,
    DateTimeOffset ExpiresAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt,
    AuthenticatedUserDto User);

public sealed record AuthenticatedUserDto(
    Guid Id,
    string Email,
    string Role,
    string DisplayName,
    string? AvatarUrl,
    string City,
    string? District,
    int ProfileCompletion);
