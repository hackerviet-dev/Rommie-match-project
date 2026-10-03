using System.Data.Common;
using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Matching.Services;

public sealed class MatchRequestService(IDbConnectionFactory connectionFactory) : IMatchRequestService
{
    private const string UniqueViolation = "23505";

    // Read from the caller's side: "other" is whoever is not @user_id. A partner without a
    // profile row (should not happen after registration) still reads back with a fallback name.
    private const string RequestSelect = """
        SELECT r.id, r.requester_id = @user_id, other.id,
               COALESCE(p.display_name, 'Thành viên'), p.avatar_url, COALESCE(p.is_verified, false),
               r.message, r.status,
               EXISTS (
                   SELECT 1 FROM user_blocks b
                   WHERE b.deleted_at IS NULL
                     AND ((b.blocker_id = r.requester_id AND b.blocked_id = r.recipient_id)
                       OR (b.blocker_id = r.recipient_id AND b.blocked_id = r.requester_id))),
               r.created_at, r.responded_at, r.ended_at, r.ended_by, r.updated_at
        FROM match_requests r
        CROSS JOIN LATERAL (
            SELECT CASE WHEN r.requester_id = @user_id THEN r.recipient_id ELSE r.requester_id END AS id
        ) other
        LEFT JOIN profiles p ON p.user_id = other.id
        WHERE (r.requester_id = @user_id OR r.recipient_id = @user_id)
        """;

    private const string BlockBetweenPair = """
        EXISTS (
            SELECT 1 FROM user_blocks b
            WHERE b.deleted_at IS NULL
              AND ((b.blocker_id = @user_id AND b.blocked_id = @other_id)
                OR (b.blocker_id = @other_id AND b.blocked_id = @user_id)))
        """;

    public async Task<MatchRequestResult> CreateAsync(
        Guid userId,
        CreateMatchRequestRequest request,
        CancellationToken cancellationToken)
    {
        var candidateId = request.CandidateId!.Value;
        if (candidateId == userId)
        {
            return MatchRequestResult.Failure(MatchRequestError.Self);
        }

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);

        // Same visibility as the matching list and GET /api/users/{id}/profile: an inactive,
        // staff, hidden or blocked member answers 404 so the request reveals nothing about them.
        await using (var visible = connection.CreateCommand())
        {
            visible.CommandText = $"""
                SELECT 1
                FROM users u
                INNER JOIN profiles p ON p.user_id = u.id
                WHERE u.id = @other_id AND u.is_active AND u.role = 'member' AND p.is_public
                  AND NOT {BlockBetweenPair}
                """;
            visible.AddParameter("user_id", userId).AddParameter("other_id", candidateId);
            if (await visible.ExecuteScalarAsync(cancellationToken) is null)
            {
                return MatchRequestResult.Failure(MatchRequestError.NotFound);
            }
        }

        if (await ReadOpenRequestAsync(connection, userId, candidateId, cancellationToken) is { } open)
        {
            return OpenConflict(open);
        }

        Guid requestId;
        try
        {
            await using var insert = connection.CreateCommand();
            insert.CommandText = """
                INSERT INTO match_requests (requester_id, recipient_id, message)
                VALUES (@user_id, @other_id, @message)
                RETURNING id
                """;
            insert
                .AddParameter("user_id", userId)
                .AddParameter("other_id", candidateId)
                .AddParameter("message", string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim());
            requestId = (Guid)(await insert.ExecuteScalarAsync(cancellationToken))!;
        }
        catch (DbException exception) when (exception.SqlState == UniqueViolation)
        {
            // Both members invited each other at the same moment; the unique index let one in.
            var existing = await ReadOpenRequestAsync(connection, userId, candidateId, cancellationToken);
            return existing is null
                ? MatchRequestResult.Failure(MatchRequestError.AlreadyPending)
                : OpenConflict(existing);
        }

        return MatchRequestResult.Success((await ReadRequestAsync(connection, userId, requestId, cancellationToken))!);
    }

    public async Task<PagedResult<MatchRequestDto>> GetMineAsync(
        Guid userId,
        MatchRequestQuery query,
        PageQuery paging,
        CancellationToken cancellationToken)
    {
        var filters = string.Concat(
            query.Direction switch
            {
                "incoming" => " AND r.recipient_id = @user_id",
                "outgoing" => " AND r.requester_id = @user_id",
                _ => ""
            },
            query.Status is null ? "" : " AND r.status = @status");

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);

        await using var countCommand = connection.CreateCommand();
        countCommand.CommandText = $"""
            SELECT count(*) FROM match_requests r
            WHERE (r.requester_id = @user_id OR r.recipient_id = @user_id){filters}
            """;
        AddFilterParameters(countCommand, userId, query);
        var totalCount = (int)(long)(await countCommand.ExecuteScalarAsync(cancellationToken))!;

        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            {RequestSelect}{filters}
            ORDER BY r.updated_at DESC, r.id
            LIMIT @limit OFFSET @offset
            """;
        AddFilterParameters(command, userId, query);
        command.AddParameter("limit", paging.PageSize).AddParameter("offset", paging.Offset);

        var requests = await ReadRequestsAsync(command, cancellationToken);
        return new PagedResult<MatchRequestDto>(requests, paging.Page, paging.PageSize, totalCount);
    }

    public async Task<MatchRequestDto?> GetAsync(Guid userId, Guid requestId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        return await ReadRequestAsync(connection, userId, requestId, cancellationToken);
    }

    // Each transition is one guarded UPDATE, so two concurrent clicks (accept vs cancel,
    // or accept twice) cannot both win. When nothing changed, the current row explains why.
    public async Task<MatchRequestResult> TransitionAsync(
        Guid userId,
        Guid requestId,
        MatchRequestAction action,
        CancellationToken cancellationToken)
    {
        var sql = action switch
        {
            MatchRequestAction.Accept => """
                UPDATE match_requests r SET status = 'accepted', responded_at = now()
                WHERE r.id = @request_id AND r.recipient_id = @user_id AND r.status = 'pending'
                  AND NOT EXISTS (
                      SELECT 1 FROM user_blocks b
                      WHERE b.deleted_at IS NULL
                        AND ((b.blocker_id = r.requester_id AND b.blocked_id = r.recipient_id)
                          OR (b.blocker_id = r.recipient_id AND b.blocked_id = r.requester_id)))
                """,
            MatchRequestAction.Decline => """
                UPDATE match_requests SET status = 'declined', responded_at = now()
                WHERE id = @request_id AND recipient_id = @user_id AND status = 'pending'
                """,
            MatchRequestAction.Cancel => """
                UPDATE match_requests SET status = 'cancelled', responded_at = now()
                WHERE id = @request_id AND requester_id = @user_id AND status = 'pending'
                """,
            MatchRequestAction.End => """
                UPDATE match_requests SET status = 'ended', ended_at = now(), ended_by = @user_id
                WHERE id = @request_id AND (requester_id = @user_id OR recipient_id = @user_id)
                  AND status = 'accepted'
                """,
            _ => throw new ArgumentOutOfRangeException(nameof(action), action, null)
        };

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("request_id", requestId).AddParameter("user_id", userId);
        var changed = await command.ExecuteNonQueryAsync(cancellationToken) > 0;

        var current = await ReadRequestAsync(connection, userId, requestId, cancellationToken);
        if (current is null)
        {
            return MatchRequestResult.Failure(MatchRequestError.NotFound);
        }

        if (changed)
        {
            return MatchRequestResult.Success(current);
        }

        var outgoing = current.Direction == "outgoing";
        var error = action switch
        {
            MatchRequestAction.Accept or MatchRequestAction.Decline when outgoing => MatchRequestError.RecipientOnly,
            MatchRequestAction.Cancel when !outgoing => MatchRequestError.RequesterOnly,
            MatchRequestAction.End => MatchRequestError.NotMatched,
            _ when current.Status != MatchRequestStatuses.Pending => MatchRequestError.NotPending,
            // Accept on a pending incoming request only fails because of a block.
            _ => MatchRequestError.Blocked
        };
        return MatchRequestResult.Failure(error, current);
    }

    private static MatchRequestResult OpenConflict(MatchRequestDto open)
    {
        return MatchRequestResult.Failure(
            open.Status == MatchRequestStatuses.Accepted
                ? MatchRequestError.AlreadyMatched
                : MatchRequestError.AlreadyPending,
            open);
    }

    private static void AddFilterParameters(DbCommand command, Guid userId, MatchRequestQuery query)
    {
        command.AddParameter("user_id", userId);
        if (query.Status is { } status)
        {
            command.AddParameter("status", status);
        }
    }

    private static async Task<MatchRequestDto?> ReadOpenRequestAsync(
        DbConnection connection,
        Guid userId,
        Guid otherId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            {RequestSelect}
              AND other.id = @other_id AND r.status IN ('pending', 'accepted')
            """;
        command.AddParameter("user_id", userId).AddParameter("other_id", otherId);
        var requests = await ReadRequestsAsync(command, cancellationToken);
        return requests.Count == 0 ? null : requests[0];
    }

    private static async Task<MatchRequestDto?> ReadRequestAsync(
        DbConnection connection,
        Guid userId,
        Guid requestId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = $"{RequestSelect} AND r.id = @request_id";
        command.AddParameter("user_id", userId).AddParameter("request_id", requestId);
        var requests = await ReadRequestsAsync(command, cancellationToken);
        return requests.Count == 0 ? null : requests[0];
    }

    private static async Task<IReadOnlyList<MatchRequestDto>> ReadRequestsAsync(
        DbCommand command,
        CancellationToken cancellationToken)
    {
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var requests = new List<MatchRequestDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            requests.Add(new MatchRequestDto(
                reader.GetGuid(0),
                reader.GetBoolean(1) ? "outgoing" : "incoming",
                new MatchPartnerDto(
                    reader.GetGuid(2),
                    reader.GetString(3),
                    reader.IsDBNull(4) ? null : reader.GetString(4),
                    reader.GetBoolean(5)),
                reader.IsDBNull(6) ? null : reader.GetString(6),
                reader.GetString(7),
                reader.GetBoolean(8),
                reader.GetFieldValue<DateTimeOffset>(9),
                reader.IsDBNull(10) ? null : reader.GetFieldValue<DateTimeOffset>(10),
                reader.IsDBNull(11) ? null : reader.GetFieldValue<DateTimeOffset>(11),
                reader.IsDBNull(12) ? null : reader.GetGuid(12),
                reader.GetFieldValue<DateTimeOffset>(13)));
        }

        return requests;
    }
}
