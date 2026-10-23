using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Users.Analytics;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController, Authorize(Roles = "admin,moderator"), Route("api/admin/analytics")]
public sealed class AnalyticsController(GoogleAnalyticsService service) : ControllerBase
{
    [EndpointSummary("Báo cáo Google Analytics cho dashboard kiểm duyệt")]
    [EndpointDescription("Cần role admin hoặc moderator. days = 7, 28 hoặc 90 (mặc định 28). 200 trả AnalyticsReportDto: tổng người dùng, người dùng mới, phiên, lượt xem trang, thời lượng phiên trung bình (giây), tỉ lệ tương tác (0–1) của kỳ hiện tại và kỳ liền trước, số liệu theo ngày, trang xem nhiều, nguồn truy cập, thiết bị, thành phố và số người đang truy cập trong 30 phút qua. Số liệu lấy từ GA4 Data API và được lưu đệm 10 phút. 400: days sai; 502: Google Analytics từ chối hoặc không phản hồi (code=permission_denied khi service account chưa được cấp quyền xem tài sản); 503: máy chủ chưa cấu hình service account.")]
    [ProducesResponseType(typeof(AnalyticsReportDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(502, Description = "Google Analytics từ chối hoặc không phản hồi.")]
    [ProducesResponseType(503, Description = "Máy chủ chưa cấu hình Google Analytics.")]
    [HttpGet("report")]
    public async Task<ActionResult<AnalyticsReportDto>> Report(
        [FromQuery] [Description("Số ngày gần nhất tính cả hôm nay: 7, 28 hoặc 90.")] int days = 28,
        CancellationToken ct = default)
    {
        if (!GoogleAnalyticsService.AllowedDays.Contains(days))
            return Problem("Khoảng thời gian phải là 7, 28 hoặc 90 ngày.", statusCode: StatusCodes.Status400BadRequest);

        var result = await service.GetReportAsync(days, ct);
        return result.Error switch
        {
            null => Ok(result.Report),
            AnalyticsError.NotConfigured => Problem(
                "Máy chủ chưa cấu hình service account Google Analytics.",
                statusCode: StatusCodes.Status503ServiceUnavailable,
                extensions: new Dictionary<string, object?> { ["code"] = "not_configured" }),
            AnalyticsError.PermissionDenied => Problem(
                $"Service account {service.ServiceAccountEmail} chưa có quyền xem tài sản Google Analytics.",
                statusCode: StatusCodes.Status502BadGateway,
                extensions: new Dictionary<string, object?> { ["code"] = "permission_denied" }),
            _ => Problem(
                "Google Analytics không phản hồi. Vui lòng thử lại sau.",
                statusCode: StatusCodes.Status502BadGateway,
                extensions: new Dictionary<string, object?> { ["code"] = "upstream" })
        };
    }
}
