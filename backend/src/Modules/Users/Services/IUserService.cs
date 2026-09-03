namespace RoomieMatch.Modules.Users.Services;

public interface IUserService
{
    object GetModuleStatus();
    Task<IReadOnlyList<UserProfileDto>> GetProfilesAsync(CancellationToken cancellationToken);
}

public sealed record UserProfileDto(
    Guid Id,
    string Email,
    string DisplayName,
    string? Occupation,
    string City,
    string? District,
    string? AvatarUrl,
    bool IsVerified,
    int ProfileCompletion);
