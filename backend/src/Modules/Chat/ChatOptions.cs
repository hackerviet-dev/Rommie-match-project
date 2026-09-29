namespace RoomieMatch.Modules.Chat;

public sealed class ChatOptions
{
    public const string SectionName = "Chat";

    // Hub calls (send, mark read, typing) per user per minute. The HTTP rate limiter only
    // sees the one request that opened the WebSocket, so the hub needs its own limit.
    public int HubInvocationsPerMinute { get; set; } = 120;
}
