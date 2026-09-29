using RoomieMatch.Modules.Chat.Services;

namespace RoomieMatch.Modules.Chat.Hubs;

// Events the server pushes to connected clients. SignalR serialises the method name as
// the event name, so the client listens with connection.on("MessageReceived", ...).
public interface IChatClient
{
    Task MessageReceived(MessageDto message);

    Task ConversationRead(ReadReceiptDto receipt);

    Task Typing(TypingDto typing);
}
