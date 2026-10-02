using System.ComponentModel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Controllers;

[ApiController]
[Route("api/users")]
public sealed class ProfilesController(IUserService userService) : ControllerBase
{
    // Members only: "Hồ sơ công khai" means visible to people on RoomieMatch, not to
    // anonymous scrapers.
    [Authorize]
    [EndpointSummary("Danh sách hồ sơ để khám phá")]
    [EndpointDescription("Cần đăng nhập. 200 trả PagedResult<UserProfileDto> gồm items, page, pageSize, totalCount, hasNextPage; không có email. Chỉ trả hồ sơ người dùng được phép xem.")]
    [ProducesResponseType(typeof(PagedResult<UserProfileDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("profiles")]
    public async Task<ActionResult<PagedResult<UserProfileDto>>> GetProfiles(
        [FromQuery] PageQuery paging,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } viewerId)
        {
            return Unauthorized();
        }

        return Ok(await userService.GetProfilesAsync(viewerId, paging, cancellationToken));
    }

    [Authorize]
    [EndpointSummary("Lấy hồ sơ của tôi")]
    [EndpointDescription("Cần đăng nhập; user được xác định từ token. 200 trả ProfileDetailDto để điền form hồ sơ; 404: chưa có hồ sơ.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(ProfileDetailDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me/profile")]
    public async Task<ActionResult<ProfileDetailDto>> GetMyProfile(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var profile = await userService.GetProfileAsync(userId, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [Authorize]
    [EndpointSummary("Cập nhật hồ sơ của tôi")]
    [EndpointDescription("Cần đăng nhập. Gửi toàn bộ dữ liệu form theo UpdateProfileRequest; các trường tùy chọn bỏ trống sẽ được ghi null. 200 trả hồ sơ sau cập nhật; 400: dữ liệu sai; 404: không có hồ sơ.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(ProfileDetailDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPut("me/profile")]
    public async Task<ActionResult<ProfileDetailDto>> UpdateMyProfile(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var profile = await userService.UpdateProfileAsync(userId, request, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [Authorize]
    [EndpointSummary("Lấy sở thích lối sống của tôi")]
    [EndpointDescription("Cần đăng nhập. 200 trả LifestylePreferencesDto cho onboarding/bộ lọc; 404: chưa lưu sở thích.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(LifestylePreferencesDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me/lifestyle")]
    public async Task<ActionResult<LifestylePreferencesDto>> GetMyLifestylePreferences(
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var preferences = await userService.GetLifestylePreferencesAsync(userId, cancellationToken);
        return preferences is null ? NotFound() : Ok(preferences);
    }

    [Authorize]
    [EndpointSummary("Lưu sở thích lối sống")]
    [EndpointDescription("Cần đăng nhập. Gửi toàn bộ SaveLifestylePreferencesRequest. 200 trả dữ liệu đã lưu; 400: dữ liệu sai. Muốn cập nhật danh sách ghép đôi thì gọi POST /api/matching/me/recalculate sau khi lưu.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(typeof(LifestylePreferencesDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPut("me/lifestyle")]
    public async Task<ActionResult<LifestylePreferencesDto>> SaveMyLifestylePreferences(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] SaveLifestylePreferencesRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await userService.SaveLifestylePreferencesAsync(userId, request, cancellationToken));
    }

    [Authorize]
    [EndpointSummary("Xem hồ sơ một thành viên")]
    [EndpointDescription("Cần đăng nhập. userId là UUID người muốn xem. 200 trả ProfileDetailDto; 404: không tồn tại hoặc không được phép xem (ẩn/bị khóa/bị chặn).")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(ProfileDetailDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("{userId:guid}/profile")]
    public async Task<ActionResult<ProfileDetailDto>> GetProfile(
        [Description("UUID thành viên cần xem hồ sơ.")] Guid userId,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } viewerId)
        {
            return Unauthorized();
        }

        var profile = await userService.GetVisibleProfileAsync(viewerId, userId, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }
}
