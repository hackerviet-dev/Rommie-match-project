namespace RoomieMatch.Shared.Events;

public interface IDomainEvent
{
    DateTime OccurredAtUtc { get; }
}
