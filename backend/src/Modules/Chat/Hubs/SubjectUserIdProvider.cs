using Microsoft.AspNetCore.SignalR;
using RoomieMatch.Shared.Authentication;

namespace RoomieMatch.Modules.Chat.Hubs;

// The default provider reads ClaimTypes.NameIdentifier, which never exists here because
// the Users module keeps the JWT "sub" claim unmapped. Clients.User(id) must match
// Guid.ToString(), so the same format is produced here.
public sealed class SubjectUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User.GetUserId()?.ToString();
    }
}
