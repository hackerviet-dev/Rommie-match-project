using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Hyperlocal.Services;

namespace RoomieMatch.Modules.Hyperlocal.Controllers;

[ApiController]
[Route("api/hyperlocal")]
public sealed class HyperlocalController(IHyperlocalService hyperlocalService) : ControllerBase
{
    // The directory is curated staff data, not user-generated, so writes are staff-only.
    private const string CuratorRoles = "admin,moderator";

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(hyperlocalService.GetModuleStatus());
    }

    [HttpGet("services")]
    public async Task<ActionResult<IReadOnlyList<LocalServiceDto>>> GetServices(
        [FromQuery] string city = "TP.HCM",
        [FromQuery] string? district = null,
        CancellationToken cancellationToken = default)
    {
        return Ok(await hyperlocalService.GetNearbyServicesAsync(city, district, cancellationToken));
    }

    [HttpGet("services/{serviceId:guid}")]
    public async Task<ActionResult<LocalServiceDto>> GetService(
        Guid serviceId,
        CancellationToken cancellationToken)
    {
        var service = await hyperlocalService.GetServiceAsync(serviceId, cancellationToken);
        return service is null ? NotFound() : Ok(service);
    }

    [Authorize(Roles = CuratorRoles)]
    [HttpPost("services")]
    public async Task<ActionResult<LocalServiceDto>> CreateService(
        SaveLocalServiceRequest request,
        CancellationToken cancellationToken)
    {
        var service = await hyperlocalService.CreateServiceAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetService), new { serviceId = service.Id }, service);
    }

    [Authorize(Roles = CuratorRoles)]
    [HttpPut("services/{serviceId:guid}")]
    public async Task<ActionResult<LocalServiceDto>> UpdateService(
        Guid serviceId,
        SaveLocalServiceRequest request,
        CancellationToken cancellationToken)
    {
        var service = await hyperlocalService.UpdateServiceAsync(serviceId, request, cancellationToken);
        return service is null ? NotFound() : Ok(service);
    }

    [Authorize(Roles = CuratorRoles)]
    [HttpDelete("services/{serviceId:guid}")]
    public async Task<IActionResult> DeleteService(Guid serviceId, CancellationToken cancellationToken)
    {
        return await hyperlocalService.DeleteServiceAsync(serviceId, cancellationToken)
            ? NoContent()
            : NotFound();
    }
}
