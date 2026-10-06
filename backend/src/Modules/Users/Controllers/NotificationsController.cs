using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Data;
using System.Text.Json;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController, Authorize, Route("api/notifications")]
public sealed class NotificationsController(IDbConnectionFactory factory) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        await using var c = await factory.OpenConnectionAsync(ct);
        await using var cmd = c.CreateCommand();
        cmd.CommandText = """
            SELECT jsonb_build_object(
              'unreadCount',(SELECT count(*) FROM notifications WHERE user_id=@user AND read_at IS NULL),
              'unreadRoomCount',(SELECT count(*) FROM notifications WHERE user_id=@user AND read_at IS NULL AND (type='room_review' OR (type='rooms' AND data->>'status' IN ('approved','rejected')))),
              'items',coalesce((SELECT jsonb_agg(to_jsonb(n) ORDER BY n."createdAt" DESC,n.id DESC) FROM (
                SELECT id,type,title,
                  CASE WHEN type IN ('room_review','rooms') AND data->>'status'='approved'
                    THEN 'Tin phòng của bạn đã được hiển thị.'
                    WHEN type IN ('room_review','rooms') AND data->>'status'='rejected'
                    THEN coalesce(nullif(data->>'recipientMessage',''),'Tin phòng đã bị từ chối. Bạn không thể sửa tin này.')
                    ELSE body END AS body,
                  CASE WHEN type='rooms' AND data->>'status' IN ('approved','rejected')
                    THEN data||jsonb_build_object('roomId',data->>'entityId','roomTitle',(SELECT title FROM rooms r WHERE r.id::text=notifications.data->>'entityId'))
                    ELSE data END AS data,
                  read_at AS "readAt",created_at AS "createdAt"
                FROM notifications WHERE user_id=@user ORDER BY created_at DESC,id DESC LIMIT 50
              ) n),'[]'::jsonb))::text
            """;
        cmd.AddParameter("user", User.GetUserId()!.Value);
        using var json = JsonDocument.Parse((string)(await cmd.ExecuteScalarAsync(ct))!);
        return Ok(json.RootElement.Clone());
    }

    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> Read(Guid id, CancellationToken ct)
    {
        await using var c = await factory.OpenConnectionAsync(ct);
        await using var cmd = c.CreateCommand();
        cmd.CommandText = "UPDATE notifications SET read_at=coalesce(read_at,now()) WHERE id=@id AND user_id=@user";
        cmd.AddParameter("id", id).AddParameter("user", User.GetUserId()!.Value);
        return await cmd.ExecuteNonQueryAsync(ct) == 0 ? NotFound() : NoContent();
    }
}
