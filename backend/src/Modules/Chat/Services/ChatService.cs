using System.Data.Common;
using Microsoft.AspNetCore.SignalR;
using RoomieMatch.Modules.Chat.Hubs;
using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Chat.Services;

public sealed class ChatService(
    IDbConnectionFactory connectionFactory,
    IHubContext<ChatHub, IChatClient> hubContext) : IChatService
{
    private const string MessageColumns = "id, conversation_id, sender_id, content, created_at, read_at";

    // The caller's side of each conversation (me) joined to the other member. A partner
    // whose account was removed takes their membership row with them, so such
    // conversations drop out of the list.
    private const string ConversationFrom = """
        FROM conversation_members me
        INNER JOIN conversations c ON c.id = me.conversation_id
        INNER JOIN LATERAL (
            SELECT cm.user_id
            FROM conversation_members cm
            WHERE cm.conversation_id = c.id AND cm.user_id <> me.user_id
            ORDER BY cm.joined_at
            LIMIT 1
        ) other ON true
        INNER JOIN profiles op ON op.user_id = other.user_id
        """;

    private const string ConversationSelect = """
        SELECT c.id, c.updated_at, other.user_id, op.display_name, op.avatar_url, op.is_verified,
               lm.id, lm.conversation_id, lm.sender_id, lm.content, lm.created_at, lm.read_at,
               (SELECT count(*)::int
                FROM messages um
                WHERE um.conversation_id = c.id
                  AND um.sender_id <> me.user_id
                  AND um.created_at > COALESCE(me.last_read_at, '-infinity'::timestamptz)),
               EXISTS (
                   SELECT 1 FROM user_blocks b
                   WHERE b.deleted_at IS NULL
                     AND ((b.blocker_id = me.user_id AND b.blocked_id = other.user_id)
                       OR (b.blocker_id = other.user_id AND b.blocked_id = me.user_id)))
        """;

    private const string LastMessageJoin = """
        LEFT JOIN LATERAL (
            SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at, m.read_at
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
        ) lm ON true
        """;

    // An unknown BeforeId (or one from another conversation) matches nothing, so the page
    // is simply empty.
    private const string BeforeCursorCondition = """
        AND (m.created_at, m.id) < (
            SELECT before.created_at, before.id
            FROM messages before
            WHERE before.id = @before_id AND before.conversation_id = @conversation_id)
        """;

    public object GetModuleStatus()
    {
        return new
        {
            module = "Chat",
            features = new[] { "conversations", "messages", "read-receipts", "typing", "signalr" }
        };
    }

    public async Task<PagedResult<ConversationDto>> GetConversationsAsync(
        Guid userId,
        PageQuery paging,
        CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);

        await using var countCommand = connection.CreateCommand();
        countCommand.CommandText = $"SELECT count(*) {ConversationFrom} WHERE me.user_id = @user_id";
        countCommand.AddParameter("user_id", userId);
        var totalCount = (int)(long)(await countCommand.ExecuteScalarAsync(cancellationToken))!;

        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            {ConversationSelect}
            {ConversationFrom}
            {LastMessageJoin}
            WHERE me.user_id = @user_id
            ORDER BY COALESCE(lm.created_at, c.created_at) DESC, c.id
            LIMIT @limit OFFSET @offset
            """;
        command
            .AddParameter("user_id", userId)
            .AddParameter("limit", paging.PageSize)
            .AddParameter("offset", paging.Offset);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var conversations = new List<ConversationDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            conversations.Add(ReadConversation(reader));
        }

        return new PagedResult<ConversationDto>(conversations, paging.Page, paging.PageSize, totalCount);
    }

    public async Task<ConversationDto?> GetConversationAsync(
        Guid userId,
        Guid conversationId,
        CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        return await ReadConversationAsync(connection, userId, conversationId, cancellationToken);
    }

    public async Task<ChatResult<ConversationDto>> StartConversationAsync(
        Guid userId,
        Guid otherUserId,
        CancellationToken cancellationToken)
    {
        if (otherUserId == userId)
        {
            return ChatResult<ConversationDto>.Failure(ChatError.InvalidRecipient);
        }

        var directKey = DirectKey(userId, otherUserId);

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);

        // An existing conversation is always returned, even with a hidden or blocked
        // partner, so the history stays reachable; IsBlocked tells the app to lock sending.
        if (await FindDirectConversationAsync(connection, null, directKey, cancellationToken) is { } existingId)
        {
            return ChatResult<ConversationDto>.Success(
                (await ReadConversationAsync(connection, userId, existingId, cancellationToken))!);
        }

        const string recipientSql = """
            SELECT
                u.is_active AND u.role = 'member' AND p.is_public,
                EXISTS (
                    SELECT 1 FROM user_blocks b
                    WHERE b.deleted_at IS NULL
                      AND ((b.blocker_id = @user_id AND b.blocked_id = u.id)
                        OR (b.blocker_id = u.id AND b.blocked_id = @user_id)))
            FROM users u
            INNER JOIN profiles p ON p.user_id = u.id
            WHERE u.id = @other_user_id
            """;

        await using (var recipient = connection.CreateCommand())
        {
            recipient.CommandText = recipientSql;
            recipient.AddParameter("user_id", userId).AddParameter("other_user_id", otherUserId);

            await using var reader = await recipient.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken) || !reader.GetBoolean(0))
            {
                return ChatResult<ConversationDto>.Failure(ChatError.InvalidRecipient);
            }

            if (reader.GetBoolean(1))
            {
                return ChatResult<ConversationDto>.Failure(ChatError.Blocked);
            }
        }

        Guid conversationId;
        await using (var transaction = await connection.BeginTransactionAsync(cancellationToken))
        {
            // The unique index on direct_key makes a concurrent "start chat" for the same
            // pair wait here and then find the row the other request created.
            await using (var insert = CreateCommand(connection, transaction, """
                INSERT INTO conversations (direct_key) VALUES (@direct_key)
                ON CONFLICT (direct_key) WHERE direct_key IS NOT NULL DO NOTHING
                RETURNING id
                """))
            {
                insert.AddParameter("direct_key", directKey);
                conversationId = await insert.ExecuteScalarAsync(cancellationToken) as Guid?
                    ?? (await FindDirectConversationAsync(connection, transaction, directKey, cancellationToken))!.Value;
            }

            await using (var members = CreateCommand(connection, transaction, """
                INSERT INTO conversation_members (conversation_id, user_id)
                VALUES (@conversation_id, @user_id), (@conversation_id, @other_user_id)
                ON CONFLICT DO NOTHING
                """))
            {
                members
                    .AddParameter("conversation_id", conversationId)
                    .AddParameter("user_id", userId)
                    .AddParameter("other_user_id", otherUserId);
                await members.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
        }

        return ChatResult<ConversationDto>.Success(
            (await ReadConversationAsync(connection, userId, conversationId, cancellationToken))!);
    }

    public async Task<ChatResult<MessagePage>> GetMessagesAsync(
        Guid userId,
        Guid conversationId,
        MessagePageQuery query,
        CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        if (await LoadMembersAsync(connection, userId, conversationId, cancellationToken) is null)
        {
            return ChatResult<MessagePage>.Failure(ChatError.NotFound);
        }

        // Keyset paging on (created_at, id): new messages arriving while the user scrolls
        // back do not shift the pages the way OFFSET would.
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT {MessageColumns}
            FROM messages m
            WHERE m.conversation_id = @conversation_id
            {(query.BeforeId is null ? "" : BeforeCursorCondition)}
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT @limit
            """;
        command
            .AddParameter("conversation_id", conversationId)
            .AddParameter("limit", query.Limit + 1);
        if (query.BeforeId is { } beforeId)
        {
            command.AddParameter("before_id", beforeId);
        }

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var messages = new List<MessageDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            messages.Add(ReadMessage(reader, 0));
        }

        var hasMore = messages.Count > query.Limit;
        return ChatResult<MessagePage>.Success(new MessagePage(messages.Take(query.Limit).ToArray(), hasMore));
    }

    public async Task<ChatResult<MessageDto>> SendMessageAsync(
        Guid userId,
        Guid conversationId,
        string content,
        CancellationToken cancellationToken)
    {
        var text = content?.Trim() ?? string.Empty;
        if (text.Length is 0 or > MessageRules.MaxLength)
        {
            return ChatResult<MessageDto>.Failure(ChatError.InvalidContent);
        }

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var members = await LoadMembersAsync(connection, userId, conversationId, cancellationToken);
        if (members is null)
        {
            return ChatResult<MessageDto>.Failure(ChatError.NotFound);
        }

        var others = members.Where(member => member.UserId != userId).ToArray();
        if (others.Any(member => member.Blocked))
        {
            return ChatResult<MessageDto>.Failure(ChatError.Blocked);
        }

        if (others.Any(member => !member.IsActive))
        {
            return ChatResult<MessageDto>.Failure(ChatError.InvalidRecipient);
        }

        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            WITH inserted AS (
                INSERT INTO messages (conversation_id, sender_id, content)
                VALUES (@conversation_id, @sender_id, @content)
                RETURNING {MessageColumns}
            ), touched AS (
                UPDATE conversations SET updated_at = now() WHERE id = @conversation_id
            )
            SELECT {MessageColumns} FROM inserted
            """;
        command
            .AddParameter("conversation_id", conversationId)
            .AddParameter("sender_id", userId)
            .AddParameter("content", text);

        MessageDto message;
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            await reader.ReadAsync(cancellationToken);
            message = ReadMessage(reader, 0);
        }

        // Routed by user id, not broadcast: only members' connections receive it.
        await hubContext.Clients.Users(UserIds(members)).MessageReceived(message);
        return ChatResult<MessageDto>.Success(message);
    }

    public async Task<ChatResult<ReadReceiptDto>> MarkReadAsync(
        Guid userId,
        Guid conversationId,
        CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var members = await LoadMembersAsync(connection, userId, conversationId, cancellationToken);
        if (members is null)
        {
            return ChatResult<ReadReceiptDto>.Failure(ChatError.NotFound);
        }

        await using var command = connection.CreateCommand();
        command.CommandText = """
            WITH marked AS (
                UPDATE messages SET read_at = now()
                WHERE conversation_id = @conversation_id AND sender_id <> @user_id AND read_at IS NULL
            )
            UPDATE conversation_members SET last_read_at = now()
            WHERE conversation_id = @conversation_id AND user_id = @user_id
            RETURNING last_read_at
            """;
        command.AddParameter("conversation_id", conversationId).AddParameter("user_id", userId);
        DateTimeOffset readAt;
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            await reader.ReadAsync(cancellationToken);
            readAt = reader.GetFieldValue<DateTimeOffset>(0);
        }

        var receipt = new ReadReceiptDto(conversationId, userId, readAt);
        await hubContext.Clients.Users(UserIds(members)).ConversationRead(receipt);
        return ChatResult<ReadReceiptDto>.Success(receipt);
    }

    public async Task<ChatError> NotifyTypingAsync(Guid userId, Guid conversationId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var members = await LoadMembersAsync(connection, userId, conversationId, cancellationToken);
        if (members is null)
        {
            return ChatError.NotFound;
        }

        var others = members.Where(member => member.UserId != userId).ToArray();
        if (others.Any(member => member.Blocked))
        {
            return ChatError.Blocked;
        }

        await hubContext.Clients.Users(UserIds(others)).Typing(new TypingDto(conversationId, userId));
        return ChatError.None;
    }

    // Null when the caller is not a member, which callers report as "not found".
    private static async Task<Member[]?> LoadMembersAsync(
        DbConnection connection,
        Guid userId,
        Guid conversationId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT cm.user_id, u.is_active,
                   EXISTS (
                       SELECT 1 FROM user_blocks b
                       WHERE b.deleted_at IS NULL
                         AND ((b.blocker_id = @user_id AND b.blocked_id = cm.user_id)
                           OR (b.blocker_id = cm.user_id AND b.blocked_id = @user_id)))
            FROM conversation_members cm
            INNER JOIN users u ON u.id = cm.user_id
            WHERE cm.conversation_id = @conversation_id
            """;

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("conversation_id", conversationId).AddParameter("user_id", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var members = new List<Member>();
        while (await reader.ReadAsync(cancellationToken))
        {
            members.Add(new Member(reader.GetGuid(0), reader.GetBoolean(1), reader.GetBoolean(2)));
        }

        return members.Any(member => member.UserId == userId) ? [.. members] : null;
    }

    private static async Task<ConversationDto?> ReadConversationAsync(
        DbConnection connection,
        Guid userId,
        Guid conversationId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            {ConversationSelect}
            {ConversationFrom}
            {LastMessageJoin}
            WHERE me.user_id = @user_id AND c.id = @conversation_id
            """;
        command.AddParameter("user_id", userId).AddParameter("conversation_id", conversationId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadConversation(reader) : null;
    }

    private static async Task<Guid?> FindDirectConversationAsync(
        DbConnection connection,
        DbTransaction? transaction,
        string directKey,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(
            connection,
            transaction,
            "SELECT id FROM conversations WHERE direct_key = @direct_key");
        command.AddParameter("direct_key", directKey);
        return await command.ExecuteScalarAsync(cancellationToken) as Guid?;
    }

    private static ConversationDto ReadConversation(DbDataReader reader)
    {
        return new ConversationDto(
            reader.GetGuid(0),
            new ChatPartnerDto(
                reader.GetGuid(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.GetBoolean(5)),
            reader.IsDBNull(6) ? null : ReadMessage(reader, 6),
            reader.GetInt32(12),
            reader.GetBoolean(13),
            reader.GetFieldValue<DateTimeOffset>(1));
    }

    private static MessageDto ReadMessage(DbDataReader reader, int offset)
    {
        return new MessageDto(
            reader.GetGuid(offset),
            reader.GetGuid(offset + 1),
            reader.GetGuid(offset + 2),
            reader.GetString(offset + 3),
            reader.GetFieldValue<DateTimeOffset>(offset + 4),
            reader.IsDBNull(offset + 5) ? null : reader.GetFieldValue<DateTimeOffset>(offset + 5));
    }

    // Same format as the 009 backfill: "<smaller uuid>:<larger uuid>", compared as
    // lowercase text byte by byte.
    private static string DirectKey(Guid a, Guid b)
    {
        var first = a.ToString();
        var second = b.ToString();
        return string.CompareOrdinal(first, second) < 0 ? $"{first}:{second}" : $"{second}:{first}";
    }

    private static IReadOnlyList<string> UserIds(IEnumerable<Member> members)
    {
        return members.Select(member => member.UserId.ToString()).ToArray();
    }

    private static DbCommand CreateCommand(DbConnection connection, DbTransaction? transaction, string sql)
    {
        var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        return command;
    }

    private sealed record Member(Guid UserId, bool IsActive, bool Blocked);
}
