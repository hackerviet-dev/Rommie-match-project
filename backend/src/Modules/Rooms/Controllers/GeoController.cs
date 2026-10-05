using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using RoomieMatch.Modules.Rooms.Services;

namespace RoomieMatch.Modules.Rooms.Controllers;

[ApiController, Authorize, Route("api/geo")]
public sealed class GeoController(GeoService service, IConfiguration config) : ControllerBase
{
    [HttpGet("config")]
    public IActionResult Config() => Ok(new { browserApiKey = config["Maps:BrowserApiKey"] ?? "", mapId = config["Maps:MapId"] ?? "", geocodingEnabled = !string.IsNullOrWhiteSpace(config["Maps:ServerApiKey"]) });
    [HttpGet("reverse")]
    public Task<IActionResult> Reverse([FromQuery] double latitude, [FromQuery] double longitude, CancellationToken ct) => Run(() => service.Reverse(latitude, longitude, ct));
    [HttpPost("resolve-link")]
    public Task<IActionResult> Link(ResolveMapsLink request, CancellationToken ct) => Run(() => service.ResolveLink(request.Link, ct));
    private async Task<IActionResult> Run(Func<Task<GeoLocation>> call)
    {
        try { return Ok(await call()); }
        catch (GeoException ex) { return Problem(ex.Message, statusCode: ex.Status); }
        catch (HttpRequestException) { return Problem("Không kết nối được Google Maps. Hãy thử lại hoặc nhập địa chỉ thủ công.", statusCode: 502); }
        catch (TaskCanceledException) when (!HttpContext.RequestAborted.IsCancellationRequested) { return Problem("Tra cứu vị trí quá thời gian. Vui lòng thử lại.", statusCode: 504); }
    }
}
public sealed record ResolveMapsLink([Required, StringLength(4096)] string Link);
