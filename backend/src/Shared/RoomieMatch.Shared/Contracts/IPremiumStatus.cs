namespace RoomieMatch.Shared.Contracts;

// Implemented by the Billing module. Other modules gate Premium features through this
// instead of referencing Billing or reading its tables.
public interface IPremiumStatus
{
    Task<bool> IsPremiumAsync(Guid userId, CancellationToken cancellationToken);
}
