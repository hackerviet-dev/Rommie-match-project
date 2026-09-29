namespace RoomieMatch.Modules.Chat.Services;

// One wording for REST problem details and hub errors.
public static class ChatErrors
{
    public static string Message(ChatError error)
    {
        return error switch
        {
            ChatError.NotFound => "Không tìm thấy cuộc trò chuyện.",
            ChatError.InvalidRecipient => "Không thể nhắn tin với người dùng này.",
            ChatError.Blocked => "Không thể nhắn tin vì một trong hai bên đã chặn người kia.",
            ChatError.InvalidContent => $"Tin nhắn phải có từ 1 đến {MessageRules.MaxLength} ký tự.",
            _ => throw new ArgumentOutOfRangeException(nameof(error), error, null)
        };
    }
}
