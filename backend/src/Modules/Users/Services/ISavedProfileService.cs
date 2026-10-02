using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Services;

// "Hồ sơ đã lưu": a private bookmark list per member, backed by saved_profiles.
// The caller always comes from the token; the target is the member being saved.
public interface ISavedProfileService
{
    Task<SavedProfileError> SaveAsync(Guid userId, Guid targetId, CancellationToken cancellationToken);

    Task UnsaveAsync(Guid userId, Guid targetId, CancellationToken cancellationToken);

    Task<PagedResult<SavedProfileDto>> GetSavedAsync(Guid userId, PageQuery paging, CancellationToken cancellationToken);

    Task<IReadOnlyList<Guid>> GetSavedIdsAsync(Guid userId, CancellationToken cancellationToken);
}

public enum SavedProfileError
{
    None,
    // No account, a staff account, a private or deactivated profile, or a block either way:
    // all answer like GET /api/users/{userId}/profile does, so nothing is revealed.
    NotFound,
    Self
}

public sealed record SavedProfileDto(
    Guid UserId,
    string DisplayName,
    string? Occupation,
    string City,
    string? District,
    string? AvatarUrl,
    bool IsVerified,
    int ProfileCompletion,
    DateTimeOffset SavedAt);
