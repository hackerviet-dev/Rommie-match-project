using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Rooms.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Rooms.Controllers;

[ApiController]
[Route("api/rooms")]
public sealed class RoomsController(IRoomService roomService) : ControllerBase
{
    [EndpointSummary("Thông tin module Rooms")]
    [EndpointDescription("API công khai, không có parameter hoặc body. Trả thông tin cấu hình cố định của module; không kiểm tra database. Kiểm tra kết nối database bằng GET /health.")]
    [ProducesResponseType(200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(roomService.GetModuleStatus());
    }

    [EndpointSummary("Tìm phòng theo khu vực và giá")]
    [EndpointDescription("API công khai. Tất cả bộ lọc là tùy chọn; bỏ bộ lọc để lấy danh sách phòng đang hiển thị. 200 trả PagedResult<RoomDto>; dùng items để render và hasNextPage để tải thêm.")]
    [ProducesResponseType(typeof(PagedResult<RoomDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet]
    public async Task<ActionResult<PagedResult<RoomDto>>> Search(
        [FromQuery] [Description("Tên thành phố; ví dụ TP.HCM. Với danh sách dịch vụ, mặc định TP.HCM.")] string? city,
        [FromQuery] [Description("Tên quận/huyện; bỏ trống để không lọc theo quận.")] string? district,
        [FromQuery] [Description("Giá thuê tối đa mỗi tháng, đơn vị VND; bỏ trống để không giới hạn giá.")] int? maxRent,
        [FromQuery] [Description("Ngày phòng phải sẵn sàng trước hoặc đúng ngày này, dạng yyyy-MM-dd.")] DateOnly? availableBy,
        [FromQuery] PageQuery paging,
        CancellationToken cancellationToken)
    {
        var query = new RoomSearchQuery(city, district, maxRent, availableBy);
        return Ok(await roomService.SearchAsync(query, paging, cancellationToken));
    }

    [Authorize]
    [EndpointSummary("Danh sách phòng tôi đã đăng")]
    [EndpointDescription("Cần đăng nhập; không có body. 200 trả mảng RoomDto của chính tài khoản để quản lý tin đăng.")]
    [ProducesResponseType(typeof(IReadOnlyList<RoomDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me")]
    public async Task<ActionResult<IReadOnlyList<RoomDto>>> GetMyRooms(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await roomService.GetOwnedByAsync(userId, cancellationToken));
    }

    [EndpointSummary("Xem chi tiết một phòng")]
    [EndpointDescription("API công khai chỉ trả tin approved/active; chủ tin và admin/moderator được đọc pending/rejected/ẩn. 200 trả RoomDto; 404: không tồn tại, bị xóa hoặc không được xem.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(RoomDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("{roomId:guid}")]
    public async Task<ActionResult<RoomDto>> Get([Description("UUID của phòng, lấy từ id trong danh sách phòng.")] Guid roomId, CancellationToken cancellationToken)
    {
        var room = await roomService.GetAsync(roomId, cancellationToken);
        if(room is not null && (room.ModerationStatus != "approved" || !room.IsActive) && room.OwnerUserId != User.GetUserId() && !User.IsInRole("admin") && !User.IsInRole("moderator"))
            return NotFound();
        return room is null ? NotFound() : Ok(room);
    }

    [Authorize]
    [EndpointSummary("Đăng phòng mới")]
    [EndpointDescription("Cần đăng nhập. Gửi SaveRoomRequest; chủ tin được lấy từ token. 201 trả RoomDto với moderationStatus=pending, chờ duyệt trước khi công khai, và header Location dẫn tới chi tiết; 400: dữ liệu không hợp lệ.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(typeof(RoomDto), 201, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost]
    public async Task<ActionResult<RoomDto>> Create(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] SaveRoomRequest request,
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
    [EndpointSummary("Cập nhật tin phòng của tôi")]
    [EndpointDescription("Cần đăng nhập và là chủ tin. PUT ghi đè toàn bộ dữ liệu, các trường tùy chọn bị bỏ sẽ trở về null hoặc mặc định (ví dụ isActive=true). 200 trả RoomDto; 400: dữ liệu sai; 403: không phải chủ; 404: không có tin.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(403, Description = "Không đủ quyền hoặc không thỏa điều kiện; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(RoomDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPut("{roomId:guid}")]
    public async Task<ActionResult<RoomDto>> Update(
        [Description("UUID của phòng, lấy từ id trong danh sách phòng.")] Guid roomId,
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] SaveRoomRequest request,
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
    [EndpointSummary("Xóa tin phòng của tôi")]
    [EndpointDescription("Cần đăng nhập và là chủ tin; không có body. Xóa mềm bằng deleted_at. 204: thành công, không có body; 403: không phải chủ; 404: không có tin.")]
    [ProducesResponseType(403, Description = "Không đủ quyền hoặc không thỏa điều kiện; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(204, Description = "Thành công; không có body.")]
    [HttpDelete("{roomId:guid}")]
    public async Task<IActionResult> Delete([Description("UUID của phòng, lấy từ id trong danh sách phòng.")] Guid roomId, CancellationToken cancellationToken)
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
