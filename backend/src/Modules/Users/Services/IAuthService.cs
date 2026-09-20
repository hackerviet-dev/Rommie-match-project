using System.ComponentModel.DataAnnotations;

namespace RoomieMatch.Modules.Users.Services;

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<AuthResult> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken);
    Task LogoutAsync(RefreshRequest request, CancellationToken cancellationToken);
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
    [Required, EmailAddress, StringLength(320)] string Email,
    [Required, StringLength(200, MinimumLength = 8)] string Password,
    [Required, StringLength(120, MinimumLength = 2)] string DisplayName,
    [Required, StringLength(100)] string City,
    [StringLength(100)] string? District,
    DateOnly? BirthDate,
    [StringLength(30)] string? Gender,
    [StringLength(120)] string? Occupation);

public sealed record LoginRequest(
    [Required, EmailAddress, StringLength(320)] string Email,
    [Required] string Password);

public sealed record RefreshRequest(
    [Required, StringLength(500)] string RefreshToken);

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
