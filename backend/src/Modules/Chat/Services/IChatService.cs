using System.ComponentModel;
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
    // member, the sender's other tabs included. imageUrl must be a chat image the sender
    // uploaded through /api/media; content may then be empty.
    Task<ChatResult<MessageDto>> SendMessageAsync(
        Guid userId,
        Guid conversationId,
        string? content,
        string? imageUrl,
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
    InvalidContent,
    // Not an image this sender uploaded for chat through /api/media.
    InvalidImage
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
    // Empty for an image sent without a caption.
    string Content,
    string? ImageUrl,
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

    [Description("UUID tin cũ nhất đang có để tải tin cũ hơn; bỏ trống khi tải lần đầu.")]
    public Guid? BeforeId { get; init; }

    [Range(1, MaxLimit)]
    [Description("Số tin mỗi lần tải; mặc định 30, từ 1 đến 50.")]
    public int Limit { get; init; } = DefaultLimit;
}

public sealed record StartConversationRequest([Required] [property: Description("UUID thành viên muốn bắt đầu trò chuyện; không phải id chính mình.")] Guid? UserId);

public sealed record SendMessageRequest(
    [StringLength(MessageRules.MaxLength)] [property: Description("Nội dung tin nhắn, tối đa 4000 ký tự sau khi bỏ khoảng trắng hai đầu; bắt buộc khi không gửi ảnh.")] string? Content,
    [StringLength(MessageRules.MaxImageUrlLength)] [property: Description("URL ảnh lấy từ POST /api/media/images với purpose=chat do chính người gửi tải lên; bỏ trống khi chỉ gửi chữ.")] string? ImageUrl = null);

public static class MessageRules
{
    // Matches the CHECK constraint on messages.content.
    public const int MaxLength = 4000;

    // Matches the CHECK constraint on messages.image_url.
    public const int MaxImageUrlLength = 500;
}
