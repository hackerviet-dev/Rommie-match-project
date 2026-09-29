namespace RoomieMatch.Shared.Http;

// SignalR endpoints. Shared so the Users module knows where to accept the access token
// from the query string: browsers cannot set an Authorization header on a WebSocket.
public static class HubPaths
{
    public const string Prefix = "/hubs";
    public const string Chat = Prefix + "/chat";
}
