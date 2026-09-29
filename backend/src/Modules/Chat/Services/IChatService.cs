using System.ComponentModel.DataAnnotations;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Chat.Services;

// Every method takes the caller's id and answers NotFound for conversations the caller is
// not a member of, so a conversation id alone never reveals anything.
public interface IChatService
{
    object GetModuleStatus();

    Task<PagedResult<ConversationDto>> GetConversationsAsync(
        Guid userId,
        PageQuery paging,
        CancellationToken cancellationToken);

    Task<ConversationDto?> GetConversationAsync(
        Guid userId,
        Guid conversationId,
        CancellationToken cancellationToken);

    // Returns the existing 1:1 conversation with that member, or creates it.
    Task<ChatResult<ConversationDto>> StartConversationAsync(
        Guid userId,
        Guid otherUserId,
        CancellationToken cancellationToken);

    Task<ChatResult<MessagePage>> GetMessagesAsync(
        Guid userId,
        Guid conversationId,
        MessagePageQuery query,
        CancellationToken cancellationToken);

    // Saves the message and pushes it over SignalR to every open connection of every
    // member, the sender's other tabs included.
    Task<ChatResult<MessageDto>> SendMessageAsync(
        Guid userId,
        Guid conversationId,
        string content,
        CancellationToken cancellationToken);

    // Marks everything the other side sent so far as read and tells them.
    Task<ChatResult<ReadReceiptDto>> MarkReadAsync(
        Guid userId,
        Guid conversationId,
        CancellationToken cancellationToken);

    // Relays "đang soạn tin…" to the other members. Nothing is stored.
    Task<ChatError> NotifyTypingAsync(Guid userId, Guid conversationId, CancellationToken cancellationToken);
}

public enum ChatError
{
    None,
    NotFound,
    // The other member is gone, hidden, not a member account, or oneself.
    InvalidRecipient,
    // A block exists in either direction; history stays readable, sending does not.
    Blocked,
    InvalidContent
}

public sealed record ChatResult<T>(ChatError Error, T? Value)
{
    public static ChatResult<T> Success(T value) => new(ChatError.None, value);

    public static ChatResult<T> Failure(ChatError error) => new(error, default);
}

public sealed record ChatPartnerDto(Guid UserId, string DisplayName, string? AvatarUrl, bool IsVerified);

public sealed record MessageDto(
    Guid Id,
    Guid ConversationId,
    Guid SenderId,
    string Content,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReadAt);

public sealed record ConversationDto(
    Guid Id,
    ChatPartnerDto Partner,
    MessageDto? LastMessage,
    int UnreadCount,
    // True while a block exists in either direction; the app should disable the composer.
    bool IsBlocked,
    DateTimeOffset UpdatedAt);

// Newest first. Pass the oldest id you have as BeforeId to load older messages.
public sealed record MessagePage(IReadOnlyList<MessageDto> Items, bool HasMore);

public sealed record ReadReceiptDto(Guid ConversationId, Guid UserId, DateTimeOffset ReadAt);

public sealed record TypingDto(Guid ConversationId, Guid UserId);

public sealed class MessagePageQuery
{
    public const int DefaultLimit = 30;
    public const int MaxLimit = 50;

    public Guid? BeforeId { get; init; }

    [Range(1, MaxLimit)]
    public int Limit { get; init; } = DefaultLimit;
}

public sealed record StartConversationRequest([Required] Guid? UserId);

public sealed record SendMessageRequest([Required, StringLength(MessageRules.MaxLength)] string Content);

public static class MessageRules
{
    // Matches the CHECK constraint on messages.content.
    public const int MaxLength = 4000;
}
