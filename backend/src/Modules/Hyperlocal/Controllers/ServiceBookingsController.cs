using System.ComponentModel;
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
    [EndpointSummary("Đặt lịch sử dụng dịch vụ")]
    [EndpointDescription("Cần đăng nhập. Gửi scheduledAt, address, contactPhone và note tùy chọn. Lịch phải sau hiện tại ít nhất 30 phút và tối đa 60 ngày. 201 trả ServiceBookingDto ở trạng thái pending; 400: dữ liệu sai; 404: dịch vụ không có/đã xóa. Chưa có API staff xác nhận hoặc hoàn thành lịch.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(ServiceBookingDto), 201, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("services/{serviceId:guid}/bookings")]
    public async Task<ActionResult<ServiceBookingDto>> Create(
        [Description("UUID dịch vụ, lấy từ id trong danh sách dịch vụ.")] Guid serviceId,
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] CreateServiceBookingRequest request,
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

    [EndpointSummary("Lấy lịch dịch vụ của tôi")]
    [EndpointDescription("Cần đăng nhập. 200 trả PagedResult<ServiceBookingDto>, mới nhất trước; chỉ gồm lịch của chính tài khoản.")]
    [ProducesResponseType(typeof(PagedResult<ServiceBookingDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
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

    [EndpointSummary("Xem chi tiết lịch dịch vụ của tôi")]
    [EndpointDescription("Cần đăng nhập. 200 trả ServiceBookingDto; 404: lịch không có hoặc thuộc người khác.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(ServiceBookingDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me/bookings/{bookingId:guid}")]
    public async Task<ActionResult<ServiceBookingDto>> GetMine([Description("UUID lịch hẹn của tôi, lấy từ id trong danh sách lịch.")] Guid bookingId, CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var booking = await bookingService.GetMineAsync(userId, bookingId, cancellationToken);
        return booking is null ? NotFound() : Ok(booking);
    }

    [EndpointSummary("Hủy lịch dịch vụ của tôi")]
    [EndpointDescription("Cần đăng nhập; không có body. Chỉ hủy pending/confirmed chưa đến giờ. 200 trả lịch đã hủy; 404: lịch không có/thuộc người khác; 409 code booking_not_cancellable: không thể hủy.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(409, Description = "Xung đột trạng thái; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(typeof(ServiceBookingDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("me/bookings/{bookingId:guid}/cancel")]
    public async Task<ActionResult<ServiceBookingDto>> Cancel([Description("UUID lịch hẹn của tôi, lấy từ id trong danh sách lịch.")] Guid bookingId, CancellationToken cancellationToken)
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
