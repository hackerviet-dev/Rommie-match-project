using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Matching.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Matching.Controllers;

[ApiController]
[Route("api/matching")]
public sealed class MatchingController(IMatchingService matchingService) : ControllerBase
{
    [EndpointSummary("Thông tin module Matching")]
    [EndpointDescription("API công khai, không có parameter hoặc body. Trả thông tin cấu hình cố định của module; không kiểm tra database. Kiểm tra kết nối database bằng GET /health.")]
    [ProducesResponseType(200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(matchingService.GetModuleStatus());
    }

    // Always the caller's own list: whose matches to read comes from the token, never
    // from the request, so one member cannot read another member's matches.
    // Advanced filters (budget, district, roomEnvironment, minCleanliness, verifiedOnly)
    // answer 403 "premium_required" on the free plan.
    [Authorize]
    [EndpointSummary("Danh sách bạn cùng phòng phù hợp")]
    [EndpointDescription("Cần đăng nhập. 200 trả PagedResult<RoommateMatchDto> của chính người gọi. Bộ lọc nâng cao cần Premium; Free nhận 403 với code premium_required. Dùng breakdown để hiển thị điểm từng tiêu chí.")]
    [ProducesResponseType(403, Description = "Không đủ quyền hoặc không thỏa điều kiện; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(typeof(PagedResult<RoommateMatchDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me/matches")]
    public async Task<ActionResult<PagedResult<RoommateMatchDto>>> GetMyMatches(
        [FromQuery] PageQuery paging,
        [FromQuery] MatchFilterQuery filters,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var result = await matchingService.GetMatchesAsync(userId, paging, filters, cancellationToken);
        return result.Error == MatchingError.None ? Ok(result.Matches) : MatchingProblem(result.Error);
    }

    // One pair in detail. 404 unless the candidate is in the caller's own list.
    [Authorize]
    [EndpointSummary("Chi tiết điểm phù hợp với một người")]
    [EndpointDescription("Cần đăng nhập. 200 trả MatchDetailDto; comparison chỉ có với Premium, Free nhận comparison=null và comparisonLocked=true. 404: ứng viên không nằm trong danh sách của tôi hoặc không còn hiển thị.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(MatchDetailDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me/matches/{candidateId:guid}")]
    public async Task<ActionResult<MatchDetailDto>> GetMyMatch([Description("UUID ứng viên, lấy từ id trong danh sách ghép đôi của tôi.")] Guid candidateId, CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var detail = await matchingService.GetMatchDetailAsync(userId, candidateId, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    [Authorize]
    [EndpointSummary("Quét và tính lại danh sách ghép đôi")]
    [EndpointDescription("Cần đăng nhập; KHÔNG có body và không có parameter (gửi body cũng bị bỏ qua). User lấy từ access token nên không nhận userId. 200 trả MatchRecalculationResult { candidatesScored: số ứng viên vừa được chấm điểm; matches: trang đầu của danh sách ghép đôi, lấy thêm trang bằng GET /api/matching/me/matches }. Giới hạn lượt quét đọc từ GET /api/matching/me/usage (scansLimit; null nghĩa là không giới hạn); Free bị giới hạn theo tháng dương lịch giờ Việt Nam còn Premium không giới hạn. Một lần quét không tìm thấy ứng viên nào thì KHÔNG tiêu hao lượt. 403 scan_quota_exceeded: đã hết lượt, problem details kèm resetsAt là thời điểm làm mới hạn mức. 409 lifestyle_required: tài khoản chưa lưu sở thích lối sống nên chưa đủ dữ liệu để tính. Lưu profile, lifestyle hoặc quiz KHÔNG tự gọi API này: chỉ gọi khi người dùng chủ động cập nhật danh sách ghép đôi vì mỗi lần gọi có thể tiêu hao lượt quét.")]
    [ProducesResponseType(403, Description = "scan_quota_exceeded: đã dùng hết lượt quét miễn phí của tháng; problem details có code=scan_quota_exceeded và resetsAt (thời điểm làm mới hạn mức).")]
    [ProducesResponseType(409, Description = "lifestyle_required: tài khoản chưa lưu sở thích lối sống; problem details có code=lifestyle_required.")]
    [ProducesResponseType(typeof(MatchRecalculationResult), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("me/recalculate")]
    public async Task<ActionResult<MatchRecalculationResult>> Recalculate(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var result = await matchingService.RecalculateAsync(userId, cancellationToken);
        return result.Error == MatchingError.None
            ? Ok(result.Recalculation)
            : MatchingProblem(result.Error, resetsAt: result.QuotaResetsAt);
    }

    // Scans and boosts used this month, the plan's limits and the active boost.
    [Authorize]
    [EndpointSummary("Lấy hạn mức quét và Boost")]
    [EndpointDescription("Cần đăng nhập. 200 trả MatchingUsageDto để hiển thị quyền lợi và số lượt còn lại. scansLimit/scansRemaining=null nghĩa là không giới hạn; kỳ hạn theo tháng dương lịch giờ Việt Nam.")]
    [ProducesResponseType(typeof(MatchingUsageDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me/usage")]
    public async Task<ActionResult<MatchingUsageDto>> GetMyUsage(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await matchingService.GetUsageAsync(userId, cancellationToken));
    }

    [Authorize]
    [EndpointSummary("Đẩy hồ sơ lên đầu trong 30 phút")]
    [EndpointDescription("Cần đăng nhập và Premium; không có body. 200 trả BoostDto. Tối đa 4 lượt/tháng. 403: premium_required hoặc boost_quota_exceeded; 409: boost_active (kèm boost) hoặc profile_hidden. Boost không làm thay đổi điểm phù hợp.")]
    [ProducesResponseType(403, Description = "Không đủ quyền hoặc không thỏa điều kiện; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(409, Description = "Xung đột trạng thái; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(typeof(BoostDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("me/boost")]
    public async Task<ActionResult<BoostDto>> Boost(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var result = await matchingService.ActivateBoostAsync(userId, cancellationToken);
        return result.Error == MatchingError.None
            ? Ok(result.Boost)
            : MatchingProblem(result.Error, resetsAt: result.QuotaResetsAt, boost: result.Boost);
    }

    // Problem details carry a stable "code" so the app can tell a Premium upsell apart
    // from other 403/409 answers without parsing the Vietnamese message.
    private ObjectResult MatchingProblem(MatchingError error, DateTimeOffset? resetsAt = null, BoostDto? boost = null)
    {
        var (status, code, detail) = error switch
        {
            MatchingError.PremiumRequired => (StatusCodes.Status403Forbidden, "premium_required",
                "Tính năng này dành cho thành viên Premium."),
            MatchingError.ScanQuotaExceeded => (StatusCodes.Status403Forbidden, "scan_quota_exceeded",
                "Bạn đã dùng hết lượt quét miễn phí của tháng này. Nâng cấp Premium để quét không giới hạn."),
            MatchingError.NoPreferences => (StatusCodes.Status409Conflict, "lifestyle_required",
                "Bạn cần lưu thông tin lối sống trước khi tính độ hợp."),
            MatchingError.ProfileHidden => (StatusCodes.Status409Conflict, "profile_hidden",
                "Hồ sơ của bạn đang ẩn. Bật \"Hồ sơ công khai\" để dùng boost."),
            MatchingError.BoostAlreadyActive => (StatusCodes.Status409Conflict, "boost_active",
                "Hồ sơ của bạn đang được boost."),
            MatchingError.BoostQuotaExceeded => (StatusCodes.Status403Forbidden, "boost_quota_exceeded",
                "Bạn đã dùng hết lượt boost của tháng này."),
            _ => throw new ArgumentOutOfRangeException(nameof(error), error, null)
        };

        var problem = ProblemDetailsFactory.CreateProblemDetails(HttpContext, status, detail: detail);
        problem.Extensions["code"] = code;
        if (resetsAt is not null)
        {
            problem.Extensions["resetsAt"] = resetsAt;
        }

        if (boost is not null)
        {
            problem.Extensions["boost"] = boost;
        }

        return new ObjectResult(problem)
        {
            StatusCode = status,
            ContentTypes = { "application/problem+json" }
        };
    }
}
