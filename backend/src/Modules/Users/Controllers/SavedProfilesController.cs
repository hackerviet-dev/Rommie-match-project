using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public sealed class SavedProfilesController(ISavedProfileService savedProfileService) : ControllerBase
{
    [EndpointSummary("Lưu hồ sơ một thành viên")]
    [EndpointDescription("Cần đăng nhập; không có body. 204: đã lưu (lưu lại hồ sơ đã lưu vẫn 204, giữ nguyên thời điểm lưu ban đầu). Chỉ lưu được hồ sơ đang xem được: thành viên đang hoạt động, hồ sơ công khai và hai bên không chặn nhau. 400 code self_target: tự lưu mình; 404: không có tài khoản hoặc không được phép xem hồ sơ.")]
    [ProducesResponseType(400, Description = "self_target: không thể tự lưu hồ sơ của mình.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(204, Description = "Thành công; không có body.")]
    [HttpPost("{userId:guid}/save")]
    public async Task<IActionResult> Save(
        [Description("UUID thành viên muốn lưu hồ sơ.")] Guid userId,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } callerId)
        {
            return Unauthorized();
        }

        var error = await savedProfileService.SaveAsync(callerId, userId, cancellationToken);
        return error == SavedProfileError.None ? NoContent() : SavedProfileProblem(error);
    }

    [EndpointSummary("Bỏ lưu hồ sơ một thành viên")]
    [EndpointDescription("Cần đăng nhập; không có body. 204 kể cả khi chưa từng lưu hồ sơ này. Bỏ lưu là xóa mềm; lưu lại sau đó dùng lại cùng bản ghi.")]
    [ProducesResponseType(204, Description = "Thành công; không có body.")]
    [HttpDelete("{userId:guid}/save")]
    public async Task<IActionResult> Unsave(
        [Description("UUID thành viên muốn bỏ lưu, lấy từ GET /api/users/me/saved-profiles.")] Guid userId,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } callerId)
        {
            return Unauthorized();
        }

        await savedProfileService.UnsaveAsync(callerId, userId, cancellationToken);
        return NoContent();
    }

    [EndpointSummary("Danh sách hồ sơ tôi đã lưu")]
    [EndpointDescription("Cần đăng nhập. 200 trả PagedResult<SavedProfileDto>, lưu gần nhất trước. Hồ sơ đã ẩn, bị khóa hoặc đang chặn nhau không xuất hiện; khi hồ sơ xem được trở lại thì tự hiện lại.")]
    [ProducesResponseType(typeof(PagedResult<SavedProfileDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me/saved-profiles")]
    public async Task<ActionResult<PagedResult<SavedProfileDto>>> GetMySavedProfiles(
        [FromQuery] PageQuery paging,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } callerId)
        {
            return Unauthorized();
        }

        return Ok(await savedProfileService.GetSavedAsync(callerId, paging, cancellationToken));
    }

    [EndpointSummary("UUID các hồ sơ tôi đã lưu")]
    [EndpointDescription("Cần đăng nhập. 200 trả mảng UUID (không phân trang), lưu gần nhất trước, cùng quy tắc hiển thị với GET /api/users/me/saved-profiles; dùng để tô nút Lưu trên danh sách và trang hồ sơ.")]
    [ProducesResponseType(typeof(IReadOnlyList<Guid>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me/saved-profiles/ids")]
    public async Task<ActionResult<IReadOnlyList<Guid>>> GetMySavedProfileIds(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } callerId)
        {
            return Unauthorized();
        }

        return Ok(await savedProfileService.GetSavedIdsAsync(callerId, cancellationToken));
    }

    // Same shape as the safety errors: a stable "code" next to the Vietnamese message.
    private ObjectResult SavedProfileProblem(SavedProfileError error)
    {
        var (status, code, detail) = error switch
        {
            SavedProfileError.NotFound => (StatusCodes.Status404NotFound, null, "Không tìm thấy hồ sơ."),
            SavedProfileError.Self => (StatusCodes.Status400BadRequest, "self_target",
                "Bạn không thể lưu hồ sơ của chính mình."),
            _ => throw new ArgumentOutOfRangeException(nameof(error), error, null)
        };

        var problem = ProblemDetailsFactory.CreateProblemDetails(HttpContext, status, detail: detail);
        if (code is not null)
        {
            problem.Extensions["code"] = code;
        }

        return new ObjectResult(problem)
        {
            StatusCode = status,
            ContentTypes = { "application/problem+json" }
        };
    }
}
