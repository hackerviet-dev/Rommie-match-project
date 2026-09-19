using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Rooms.Services;
using RoomieMatch.Shared.Authentication;

namespace RoomieMatch.Modules.Rooms.Controllers;

[ApiController]
[Route("api/rooms")]
public sealed class RoomsController(IRoomService roomService) : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(roomService.GetModuleStatus());
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoomDto>>> Search(
        [FromQuery] string? city,
        [FromQuery] string? district,
        [FromQuery] int? maxRent,
        [FromQuery] DateOnly? availableBy,
        CancellationToken cancellationToken)
    {
        var query = new RoomSearchQuery(city, district, maxRent, availableBy);
        return Ok(await roomService.SearchAsync(query, cancellationToken));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<IReadOnlyList<RoomDto>>> GetMyRooms(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await roomService.GetOwnedByAsync(userId, cancellationToken));
    }

    [HttpGet("{roomId:guid}")]
    public async Task<ActionResult<RoomDto>> Get(Guid roomId, CancellationToken cancellationToken)
    {
        var room = await roomService.GetAsync(roomId, cancellationToken);
        return room is null ? NotFound() : Ok(room);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<RoomDto>> Create(
        SaveRoomRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var room = await roomService.CreateAsync(userId, request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { roomId = room.Id }, room);
    }

    [Authorize]
    [HttpPut("{roomId:guid}")]
    public async Task<ActionResult<RoomDto>> Update(
        Guid roomId,
        SaveRoomRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var result = await roomService.UpdateAsync(roomId, userId, request, cancellationToken);
        return result.Room is null ? Failure(result.Error) : Ok(result.Room);
    }

    [Authorize]
    [HttpDelete("{roomId:guid}")]
    public async Task<IActionResult> Delete(Guid roomId, CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var error = await roomService.DeleteAsync(roomId, userId, cancellationToken);
        return error is RoomWriteError.None ? NoContent() : Failure(error);
    }

    private ObjectResult Failure(RoomWriteError error)
    {
        return error switch
        {
            RoomWriteError.NotOwner => Problem(
                "Bạn không phải chủ của tin đăng này.",
                statusCode: StatusCodes.Status403Forbidden),
            _ => Problem(
                "Không tìm thấy tin đăng.",
                statusCode: StatusCodes.Status404NotFound)
        };
    }
}
