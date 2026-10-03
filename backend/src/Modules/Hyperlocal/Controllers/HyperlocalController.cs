using System.ComponentModel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Hyperlocal.Services;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Hyperlocal.Controllers;

[ApiController]
[Route("api/hyperlocal")]
public sealed class HyperlocalController(IHyperlocalService hyperlocalService) : ControllerBase
{
    // The directory is curated staff data, not user-generated, so writes are staff-only.
    private const string CuratorRoles = "admin,moderator";

    [EndpointSummary("Thông tin module Hyperlocal")]
    [EndpointDescription("API công khai, không có parameter hoặc body. Trả thông tin cấu hình cố định của module; không kiểm tra database. Kiểm tra kết nối database bằng GET /health.")]
    [ProducesResponseType(200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(hyperlocalService.GetModuleStatus());
    }

    [EndpointSummary("Tìm dịch vụ gần nhà")]
    [EndpointDescription("API công khai. Lọc theo city, district và category; so khớp category với giá trị trong database (ví dụ Giặt ủi, Giao nước). 200 trả PagedResult<LocalServiceDto>. Hiện lọc theo khu vực, không nhận tọa độ GPS hoặc tự tính bán kính từ vị trí người dùng.")]
    [ProducesResponseType(typeof(PagedResult<LocalServiceDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("services")]
    public async Task<ActionResult<PagedResult<LocalServiceDto>>> GetServices(
        [FromQuery] PageQuery paging,
        [FromQuery] [Description("Tên thành phố; ví dụ TP.HCM. Với danh sách dịch vụ, mặc định TP.HCM.")] string city = "TP.HCM",
        [FromQuery] [Description("Tên quận/huyện; bỏ trống để không lọc theo quận.")] string? district = null,
        [FromQuery] [Description("Loại dịch vụ đúng như database, ví dụ Giặt ủi hoặc Giao nước; bỏ trống để lấy mọi loại.")] string? category = null,
        CancellationToken cancellationToken = default)
    {
        return Ok(await hyperlocalService.GetNearbyServicesAsync(
            city, district, category, paging, cancellationToken));
    }

    [EndpointSummary("Xem chi tiết dịch vụ")]
    [EndpointDescription("API công khai. 200 trả LocalServiceDto cho trang chi tiết/đặt lịch; 404: dịch vụ không tồn tại hoặc đã xóa.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(LocalServiceDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("services/{serviceId:guid}")]
    public async Task<ActionResult<LocalServiceDto>> GetService(
        [Description("UUID dịch vụ, lấy từ id trong danh sách dịch vụ.")] Guid serviceId,
        CancellationToken cancellationToken)
    {
        var service = await hyperlocalService.GetServiceAsync(serviceId, cancellationToken);
        return service is null ? NotFound() : Ok(service);
    }

    [Authorize(Roles = CuratorRoles)]
    [EndpointSummary("Thêm dịch vụ vào danh mục")]
    [EndpointDescription("Cần đăng nhập với role admin hoặc moderator. Gửi SaveLocalServiceRequest. 201 trả LocalServiceDto và Location; 400: dữ liệu sai; 403: thiếu quyền.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(403, Description = "Không đủ quyền hoặc không thỏa điều kiện; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(typeof(LocalServiceDto), 201, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("services")]
    public async Task<ActionResult<LocalServiceDto>> CreateService(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] SaveLocalServiceRequest request,
        CancellationToken cancellationToken)
    {
        var service = await hyperlocalService.CreateServiceAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetService), new { serviceId = service.Id }, service);
    }

    [Authorize(Roles = CuratorRoles)]
    [EndpointSummary("Cập nhật dịch vụ trong danh mục")]
    [EndpointDescription("Cần role admin hoặc moderator. Gửi toàn bộ SaveLocalServiceRequest. 200 trả LocalServiceDto; 400: dữ liệu sai; 403: thiếu quyền; 404: không có dịch vụ.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(403, Description = "Không đủ quyền hoặc không thỏa điều kiện; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(LocalServiceDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPut("services/{serviceId:guid}")]
    public async Task<ActionResult<LocalServiceDto>> UpdateService(
        [Description("UUID dịch vụ, lấy từ id trong danh sách dịch vụ.")] Guid serviceId,
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] SaveLocalServiceRequest request,
        CancellationToken cancellationToken)
    {
        var service = await hyperlocalService.UpdateServiceAsync(serviceId, request, cancellationToken);
        return service is null ? NotFound() : Ok(service);
    }

    [Authorize(Roles = CuratorRoles)]
    [EndpointSummary("Xóa dịch vụ khỏi danh mục")]
    [EndpointDescription("Cần role admin hoặc moderator; không có body. Xóa mềm. 204: thành công, không có body; 403: thiếu quyền; 404: không có dịch vụ.")]
    [ProducesResponseType(403, Description = "Không đủ quyền hoặc không thỏa điều kiện; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(204, Description = "Thành công; không có body.")]
    [HttpDelete("services/{serviceId:guid}")]
    public async Task<IActionResult> DeleteService([Description("UUID dịch vụ, lấy từ id trong danh sách dịch vụ.")] Guid serviceId, CancellationToken cancellationToken)
    {
        return await hyperlocalService.DeleteServiceAsync(serviceId, cancellationToken)
            ? NoContent()
            : NotFound();
    }
}
