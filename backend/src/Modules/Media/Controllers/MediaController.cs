using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RoomieMatch.Modules.Media.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Contracts;
using RoomieMatch.Shared.Http;

namespace RoomieMatch.Modules.Media.Controllers;

[ApiController]
[Authorize]
[Route("api/media")]
public sealed class MediaController(IImageUploadService imageUploadService) : ControllerBase
{
    // Room for the multipart framing around a file at the limit; anything larger is cut off by
    // the server with 413 before the body is read.
    private const long RequestLimit = MediaRules.MaxImageBytes + 1024 * 1024;

    [AllowAnonymous]
    [EndpointSummary("Thông tin module Media")]
    [EndpointDescription("API công khai, không có parameter hoặc body. Cho biết đã cấu hình Cloudinary chưa (configured), dung lượng tối đa và định dạng ảnh được nhận.")]
    [ProducesResponseType(200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(imageUploadService.GetModuleStatus());
    }

    [EndpointSummary("Tải ảnh lên")]
    [EndpointDescription("Cần đăng nhập. Gửi multipart/form-data gồm file (ảnh JPG, PNG hoặc WebP, tối đa 5 MB; kiểm tra theo nội dung file, không theo tên) và purpose: avatar (ảnh đại diện), chat (ảnh gửi trong tin nhắn) hoặc verification (ảnh CCCD/CMND và ảnh chân dung để xác minh). Ảnh được thu nhỏ để cạnh dài nhất không quá 2048 px và bỏ metadata (GPS). 200 trả UploadedImageDto; dùng url làm avatarUrl khi PUT /api/users/me/profile, imageUrl khi gửi tin nhắn, hoặc frontImageUrl/backImageUrl/selfieImageUrl khi POST /api/users/me/verification. 400: thiếu file, purpose sai hoặc không phải ảnh hợp lệ; 401: thiếu token; 413: ảnh quá 5 MB; 429: tải quá nhiều; 502: Cloudinary từ chối; 503: máy chủ chưa cấu hình Cloudinary.")]
    [ProducesResponseType(typeof(UploadedImageDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(413, Description = "Ảnh vượt quá dung lượng cho phép.")]
    [ProducesResponseType(502, Description = "Dịch vụ lưu trữ ảnh từ chối hoặc không phản hồi.")]
    [ProducesResponseType(503, Description = "Máy chủ chưa cấu hình lưu trữ ảnh.")]
    [EnableRateLimiting(RateLimitPolicies.Uploads)]
    [RequestSizeLimit(RequestLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = RequestLimit)]
    [Consumes("multipart/form-data")]
    [HttpPost("images")]
    public async Task<ActionResult<UploadedImageDto>> UploadImage(
        [Description("File ảnh JPG, PNG hoặc WebP, tối đa 5 MB.")] IFormFile? file,
        [FromForm] [Description("avatar (ảnh đại diện), chat (ảnh gửi trong tin nhắn) hoặc verification (ảnh giấy tờ/chân dung để xác minh).")] string? purpose,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        if (file is null || file.Length == 0)
        {
            return Problem("Vui lòng chọn một ảnh.", statusCode: StatusCodes.Status400BadRequest);
        }

        ImagePurpose? parsed = purpose?.Trim().ToLowerInvariant() switch
        {
            "avatar" => ImagePurpose.Avatar,
            "chat" => ImagePurpose.Chat,
            "verification" => ImagePurpose.Verification,
            _ => null
        };
        if (parsed is null)
        {
            return Problem("purpose phải là avatar, chat hoặc verification.", statusCode: StatusCodes.Status400BadRequest);
        }

        await using var stream = file.OpenReadStream();
        var result = await imageUploadService.UploadAsync(userId, parsed.Value, stream, file.Length, cancellationToken);
        if (result.Error == MediaError.None)
        {
            return Ok(result.Value);
        }

        var status = result.Error switch
        {
            MediaError.NotConfigured => StatusCodes.Status503ServiceUnavailable,
            MediaError.TooLarge => StatusCodes.Status413PayloadTooLarge,
            MediaError.UploadFailed => StatusCodes.Status502BadGateway,
            _ => StatusCodes.Status400BadRequest
        };
        return Problem(MediaErrors.Message(result.Error), statusCode: status);
    }
}
