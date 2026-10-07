using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using RoomieMatch.Modules.Chat.Services;
using RoomieMatch.Shared.Authentication;

namespace RoomieMatch.Modules.Chat.Hubs;

// Clients connect to /hubs/chat?access_token=<JWT>. Nothing is broadcast to everyone:
// each event goes to the user ids of the conversation's members (see SubjectUserIdProvider),
// which reaches every open tab or device of those members and no one else.
[Authorize]
public sealed class ChatHub(IChatService chatService) : Hub<IChatClient>
{
    // Returns the saved message to the caller as the invocation result; the other member
    // and the caller's other connections get it through MessageReceived.
    public async Task<MessageDto> SendMessage(Guid conversationId, string content)
    {
        return Unwrap(await chatService.SendMessageAsync(CallerId, conversationId, content, null, Context.ConnectionAborted));
    }

    // SignalR does not overload hub methods by argument count, so images get their own name.
    // imageUrl comes from POST /api/media/images with purpose=chat; caption may be null.
    public async Task<MessageDto> SendImageMessage(Guid conversationId, string imageUrl, string? caption)
    {
        return Unwrap(await chatService.SendMessageAsync(CallerId, conversationId, caption, imageUrl, Context.ConnectionAborted));
    }

    public async Task<ReadReceiptDto> MarkRead(Guid conversationId)
    {
        return Unwrap(await chatService.MarkReadAsync(CallerId, conversationId, Context.ConnectionAborted));
    }

    public async Task Typing(Guid conversationId)
    {
        var error = await chatService.NotifyTypingAsync(CallerId, conversationId, Context.ConnectionAborted);
        if (error != ChatError.None)
        {
            throw new HubException(ChatErrors.Message(error));
        }
    }

    private Guid CallerId => Context.User?.GetUserId() ?? throw new HubException("Phiên đăng nhập không hợp lệ.");

    // HubException is the only exception whose message SignalR passes to the client.
    private static T Unwrap<T>(ChatResult<T> result)
    {
        return result.Error == ChatError.None
            ? result.Value!
            : throw new HubException(ChatErrors.Message(result.Error));
    }
}
