using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Authentication;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController]
[Authorize]
[Route("api/users/me/verification")]
public sealed class IdentityVerificationController(IdentityVerificationService service) : ControllerBase
{
    [EndpointSummary("Trạng thái xác minh danh tính của tôi")]
    [EndpointDescription("Cần đăng nhập. 200 trả VerificationStatusDto: isVerified và lần gửi gần nhất (latest, null nếu chưa gửi). Khi latest.status=rejected, xem rejectionReason rồi gửi lại hồ sơ mới.")]
    [ProducesResponseType(typeof(VerificationStatusDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet]
    public async Task<ActionResult<VerificationStatusDto>> Get(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await service.GetMineAsync(userId, cancellationToken));
    }

    [EndpointSummary("Gửi hồ sơ xác minh danh tính")]
    [EndpointDescription("Cần đăng nhập. Tải ba ảnh trước qua POST /api/media/images với purpose=verification (mặt trước, mặt sau giấy tờ và ảnh chân dung cầm giấy tờ), rồi gửi {documentType, documentNumberLast4, frontImageUrl, backImageUrl, selfieImageUrl}. Chỉ lưu 4 số cuối giấy tờ. 201 trả VerificationSubmissionDto trạng thái pending, chờ kiểm duyệt viên xử lý qua /api/admin/verifications. 400: dữ liệu sai hoặc code invalid_image (ảnh không do bạn tải lên với purpose=verification, hoặc trùng nhau); 409 code profile_missing: chưa hoàn tất onboarding; already_verified: hồ sơ đã được xác minh; verification_pending: đang có hồ sơ chờ duyệt.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ hoặc invalid_image.")]
    [ProducesResponseType(409, Description = "profile_missing, already_verified hoặc verification_pending.")]
    [ProducesResponseType(typeof(VerificationSubmissionDto), 201, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost]
    public async Task<ActionResult<VerificationSubmissionDto>> Submit(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] SubmitVerificationRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var result = await service.SubmitAsync(userId, request, cancellationToken);
        if (result.Error == VerificationError.None)
        {
            return StatusCode(StatusCodes.Status201Created, result.Value);
        }

        var (status, code, detail) = result.Error switch
        {
            VerificationError.InvalidImage => (StatusCodes.Status400BadRequest, "invalid_image",
                "Ảnh xác minh phải do bạn tải lên với purpose=verification và ba ảnh phải khác nhau."),
            VerificationError.ProfileMissing => (StatusCodes.Status409Conflict, "profile_missing",
                "Hoàn tất hồ sơ cá nhân trước khi xác minh danh tính."),
            VerificationError.AlreadyVerified => (StatusCodes.Status409Conflict, "already_verified",
                "Hồ sơ của bạn đã được xác minh."),
            VerificationError.AlreadyPending => (StatusCodes.Status409Conflict, "verification_pending",
                "Bạn đang có hồ sơ xác minh chờ duyệt."),
            _ => throw new ArgumentOutOfRangeException(nameof(result.Error), result.Error, null)
        };

        var problem = ProblemDetailsFactory.CreateProblemDetails(HttpContext, status, detail: detail);
        problem.Extensions["code"] = code;
        return new ObjectResult(problem)
        {
            StatusCode = status,
            ContentTypes = { "application/problem+json" }
        };
    }
}
