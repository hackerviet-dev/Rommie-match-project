using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController, Authorize, Route("api/users/me/notifications")]
public sealed class NotificationsController(IDbConnectionFactory factory) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<JsonElement>>> List([FromQuery] PageQuery paging, [FromQuery] bool unreadOnly, CancellationToken ct)
    {
        if (User.GetUserId() is not { } userId) return Unauthorized();
        await using var connection = await factory.OpenConnectionAsync(ct);
        // Repeatable-read keeps counts and page consistent during concurrent event writes.
        await using var tx = await connection.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead, ct);
        await using var count = connection.CreateCommand();
        count.Transaction = tx;
        count.CommandText = "SELECT count(*) FROM notifications WHERE user_id=@user AND (NOT @unread OR read_at IS NULL)";
        count.AddParameter("user", userId).AddParameter("unread", unreadOnly);
        var total = checked((int)(long)(await count.ExecuteScalarAsync(ct))!);
        await using var command = connection.CreateCommand();
        command.Transaction = tx;
        command.CommandText = """
            SELECT jsonb_build_object('id',id,'type',type,'title',title,'body',body,'data',data,'readAt',read_at,'createdAt',created_at)::text
            FROM notifications WHERE user_id=@user AND (NOT @unread OR read_at IS NULL)
            ORDER BY created_at DESC,id DESC LIMIT @limit OFFSET @offset
            """;
        command.AddParameter("user", userId).AddParameter("unread", unreadOnly).AddParameter("limit", paging.PageSize).AddParameter("offset", paging.Offset);
        var rows = new List<JsonElement>();
        await using (var reader = await command.ExecuteReaderAsync(ct))
            while (await reader.ReadAsync(ct))
            {
                using var doc = JsonDocument.Parse(reader.GetString(0));
                rows.Add(doc.RootElement.Clone());
            }
        await tx.CommitAsync(ct);
        return Ok(new PagedResult<JsonElement>(rows, paging.Page, paging.PageSize, total));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> Unread(CancellationToken ct)
    {
        if (User.GetUserId() is not { } userId) return Unauthorized();
        await using var connection = await factory.OpenConnectionAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT count(*) FROM notifications WHERE user_id=@user AND read_at IS NULL";
        command.AddParameter("user", userId);
        return Ok(new { count = (long)(await command.ExecuteScalarAsync(ct))! });
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> Read(Guid id, CancellationToken ct)
    {
        if (User.GetUserId() is not { } userId) return Unauthorized();
        await using var connection = await factory.OpenConnectionAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE id=@id AND user_id=@user";
        command.AddParameter("id", id).AddParameter("user", userId);
        return await command.ExecuteNonQueryAsync(ct) == 0 ? NotFound() : NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> ReadAll(CancellationToken ct)
    {
        if (User.GetUserId() is not { } userId) return Unauthorized();
        await using var connection = await factory.OpenConnectionAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE notifications SET read_at=now() WHERE user_id=@user AND read_at IS NULL";
        command.AddParameter("user", userId);
        await command.ExecuteNonQueryAsync(ct);
        return NoContent();
    }
}
