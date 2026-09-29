using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Hyperlocal.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Hyperlocal.Controllers;

[ApiController]
[Authorize]
[Route("api/hyperlocal")]
public sealed class ServiceBookingsController(IServiceBookingService bookingService) : ControllerBase
{
    [HttpPost("services/{serviceId:guid}/bookings")]
    public async Task<ActionResult<ServiceBookingDto>> Create(
        Guid serviceId,
        CreateServiceBookingRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var booking = await bookingService.CreateAsync(userId, serviceId, request, cancellationToken);
        if (booking is null)
        {
            return Problem("Không tìm thấy dịch vụ.", statusCode: StatusCodes.Status404NotFound);
        }

        return CreatedAtAction(nameof(GetMine), new { bookingId = booking.Id }, booking);
    }

    [HttpGet("me/bookings")]
    public async Task<ActionResult<PagedResult<ServiceBookingDto>>> GetMyBookings(
        [FromQuery] PageQuery paging,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await bookingService.GetMineAsync(userId, paging, cancellationToken));
    }

    [HttpGet("me/bookings/{bookingId:guid}")]
    public async Task<ActionResult<ServiceBookingDto>> GetMine(Guid bookingId, CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var booking = await bookingService.GetMineAsync(userId, bookingId, cancellationToken);
        return booking is null ? NotFound() : Ok(booking);
    }

    [HttpPost("me/bookings/{bookingId:guid}/cancel")]
    public async Task<ActionResult<ServiceBookingDto>> Cancel(Guid bookingId, CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var result = await bookingService.CancelAsync(userId, bookingId, cancellationToken);
        return result.Error switch
        {
            BookingCancelError.None => Ok(result.Booking),
            BookingCancelError.NotFound => NotFound(),
            _ => CodedProblem(
                StatusCodes.Status409Conflict,
                "booking_not_cancellable",
                "Lịch hẹn đã qua, đã hoàn thành hoặc đã huỷ nên không thể huỷ.")
        };
    }

    // Same shape as the matching errors: a stable "code" next to the Vietnamese message.
    private ObjectResult CodedProblem(int status, string code, string detail)
    {
        var problem = ProblemDetailsFactory.CreateProblemDetails(HttpContext, status, detail: detail);
        problem.Extensions["code"] = code;
        return new ObjectResult(problem)
        {
            StatusCode = status,
            ContentTypes = { "application/problem+json" }
        };
    }
}
