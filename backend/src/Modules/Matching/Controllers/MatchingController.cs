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
    [HttpGet("me/matches/{candidateId:guid}")]
    public async Task<ActionResult<MatchDetailDto>> GetMyMatch(Guid candidateId, CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var detail = await matchingService.GetMatchDetailAsync(userId, candidateId, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    [Authorize]
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
