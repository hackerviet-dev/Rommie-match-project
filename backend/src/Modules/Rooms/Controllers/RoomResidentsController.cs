using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Rooms.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Rooms.Controllers;

[ApiController, Route("api/rooms/{roomId:guid}/residents")]
public sealed class RoomResidentsController(IRoomService rooms, IDbConnectionFactory factory) : ControllerBase
{
    private async Task<bool> CanRead(Guid roomId, CancellationToken ct)
    {
        var room = await rooms.GetAsync(roomId, ct);
        return room is not null && (room.IsActive && room.ModerationStatus == "approved" || room.OwnerUserId == User.GetUserId() || User.IsInRole("admin") || User.IsInRole("moderator"));
    }
    [HttpGet]
    public async Task<IActionResult> Get(Guid roomId, CancellationToken ct)
    {
        if (!await CanRead(roomId, ct)) return NotFound();
        await using var connection = await factory.OpenConnectionAsync(ct); await using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            SELECT coalesce((SELECT jsonb_agg(x) FROM (SELECT DISTINCT p.user_id AS "userId",p.display_name AS "displayName",p.avatar_url AS "avatarUrl"
            FROM housing_groups g JOIN housing_group_members m ON m.group_id=g.id JOIN profiles p ON p.user_id=m.user_id
            JOIN users u ON u.id=m.user_id WHERE g.room_id=@room AND m.status='active' AND m.share_room_profile AND u.is_active AND p.is_public
            AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=@user AND b.blocked_id=m.user_id) OR (b.blocker_id=m.user_id AND b.blocked_id=@user))) x),'[]'::jsonb)::text,
            EXISTS(SELECT 1 FROM housing_groups g JOIN housing_group_members m ON m.group_id=g.id WHERE g.room_id=@room AND m.user_id=@user AND m.status='active'),
            EXISTS(SELECT 1 FROM housing_groups g JOIN housing_group_members m ON m.group_id=g.id WHERE g.room_id=@room AND m.user_id=@user AND m.status='active' AND m.share_room_profile)
            """;
        cmd.AddParameter("room", roomId).AddParameter("user", User.GetUserId() ?? Guid.Empty);
        await using var reader = await cmd.ExecuteReaderAsync(ct); await reader.ReadAsync(ct);
        return Ok(new { residents = JsonSerializer.Deserialize<JsonElement>(reader.GetString(0)), canShare = reader.GetBoolean(1), isSharing = reader.GetBoolean(2) });
    }
    [Authorize, HttpPut("visibility")]
    public async Task<IActionResult> Visibility(Guid roomId, RoomResidentVisibility request, CancellationToken ct)
    {
        if (User.GetUserId() is not { } user) return Unauthorized();
        if (!await CanRead(roomId, ct)) return NotFound();
        await using var connection = await factory.OpenConnectionAsync(ct); await using var cmd = connection.CreateCommand();
        cmd.CommandText = "UPDATE housing_group_members m SET share_room_profile=@share FROM housing_groups g WHERE g.id=m.group_id AND g.room_id=@room AND m.user_id=@user AND m.status='active'";
        cmd.AddParameter("room", roomId).AddParameter("user", user).AddParameter("share", request.Share);
        return await cmd.ExecuteNonQueryAsync(ct) == 0 ? Forbid() : NoContent();
    }
}
public sealed record RoomResidentVisibility(bool Share);
