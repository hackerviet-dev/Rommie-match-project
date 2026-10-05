using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Rooms.Services;
using RoomieMatch.Shared.Authentication;

namespace RoomieMatch.Modules.Rooms.Controllers;

[ApiController, Authorize, Route("api/rooms/photos")]
public sealed class RoomPhotosController(RoomPhotoService service) : ControllerBase
{
    [HttpPost, RequestSizeLimit(11 * 1024 * 1024), RequestFormLimits(MultipartBodyLengthLimit = 11 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile photo, CancellationToken ct)
    {
        if (User.GetUserId() is not { } user) return Unauthorized();
        try { return Ok(new { url = await service.Upload(user, photo, ct) }); }
        catch (RoomPhotoException ex) { return Problem(ex.Message, statusCode: ex.Status); }
        catch (HttpRequestException) { return Problem("Không kết nối được dịch vụ upload ảnh.", statusCode: 502); }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested) { return Problem("Upload quá thời gian. Vui lòng thử lại.", statusCode: 504); }
    }
}
