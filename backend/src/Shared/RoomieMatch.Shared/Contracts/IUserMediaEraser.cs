namespace RoomieMatch.Shared.Contracts;

// Implemented by the Media module. Called before an account is hard deleted so the member's
// uploads (avatars, chat photos, identity documents, room photos) do not outlive the account.
public interface IUserMediaEraser
{
    // True when nothing of the user's is left in storage (also when storage is not configured).
    Task<bool> DeleteAllForUserAsync(Guid userId, CancellationToken cancellationToken);
}
