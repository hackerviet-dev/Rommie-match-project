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
    [EndpointDescription("Cần đăng nhập; user lấy từ access token nên không có tham số userId. 200 trả ProfileDetailDto để điền form onboarding: birthDate là ngày dạng yyyy-MM-dd (không phải age), gender là male/female/other hoặc null, profileCompletion 0-100. 401: thiếu hoặc hết hạn token; 404: tài khoản chưa có hồ sơ.")]
    [ProducesResponseType(404, Description = "Tài khoản chưa có hồ sơ; không phải lỗi dữ liệu của client.")]
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
    [EndpointDescription("Cần đăng nhập; PUT ghi đè toàn bộ hồ sơ của user trong token, không phải cập nhật từng phần và không nhận userId từ client. Bắt buộc: displayName (2-120 ký tự) và city. Tùy chọn bỏ trống hoặc null sẽ được lưu null (xóa giá trị cũ): birthDate, gender, occupation, bio, district, avatarUrl. birthDate gửi dạng yyyy-MM-dd, KHÔNG gửi tuổi/age; gender chỉ male/female/other hoặc null. profileCompletion được backend tính lại và trả trong response. 200 trả ProfileDetailDto sau cập nhật; 400: dữ liệu sai; 401: thiếu hoặc hết hạn token; 404: tài khoản chưa có hồ sơ. Gọi POST /api/matching/me/recalculate sau khi lưu nếu muốn cập nhật danh sách ghép đôi.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(404, Description = "Tài khoản chưa có hồ sơ; không phải lỗi dữ liệu của client.")]
    [ProducesResponseType(typeof(ProfileDetailDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPut("me/profile")]
    public async Task<ActionResult<ProfileDetailDto>> UpdateMyProfile(
        [Description("JSON hồ sơ, tên trường dùng camelCase. PUT ghi đè toàn bộ: displayName và city bắt buộc; birthDate, gender, occupation, bio, district, avatarUrl bỏ trống/null thì lưu null; birthDate dạng yyyy-MM-dd (không gửi age); gender là male/female/other; profileCompletion do backend tính.")] UpdateProfileRequest request,
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
    [EndpointDescription("Cần đăng nhập; chỉ đọc bản ghi của chính user trong token, không có tham số userId. 200 trả LifestylePreferencesDto: sleepSchedule dạng \"HH:mm–HH:mm\", cleanliness 1-5, socialStyle, roomEnvironment quiet/moderate/lively hoặc null, budgetMin/budgetMax là VND, interests đã gộp trùng. 401: thiếu hoặc hết hạn token; 404: tài khoản chưa lưu sở thích — onboarding nên coi đây là \"chưa có dữ liệu\", không phải lỗi.")]
    [ProducesResponseType(404, Description = "Tài khoản chưa lưu sở thích lối sống; không phải lỗi dữ liệu của client.")]
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
    [EndpointDescription("Cần đăng nhập; PUT ghi đè toàn bộ sở thích lối sống của user trong token và tự tạo bản ghi ở lần lưu đầu (upsert), không nhận userId từ client. Bắt buộc: sleepSchedule (\"HH:mm–HH:mm\", ví dụ 23:00–07:00), cleanliness 1-5, socialStyle (ngoại hướng/extrovert, hướng nội/introvert, cân bằng/balanced). smoking và petFriendly là boolean nên bỏ trống sẽ lưu false; cookingFrequency, roomEnvironment, moveInDate bỏ trống/null sẽ lưu null; interests bỏ trống/null lưu mảng rỗng (tối đa 20 mục × 40 ký tự, tự gộp trùng, không nhận phần tử null hoặc rỗng); budgetMin/budgetMax bỏ trống sẽ lưu 0, là VND và budgetMax phải >= budgetMin. 200 trả dữ liệu đã lưu; 400: dữ liệu sai; 401: thiếu hoặc hết hạn token. Gọi POST /api/matching/me/recalculate sau khi lưu để tính lại điểm ghép đôi.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(typeof(LifestylePreferencesDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPut("me/lifestyle")]
    public async Task<ActionResult<LifestylePreferencesDto>> SaveMyLifestylePreferences(
        [Description("JSON sở thích lối sống, tên trường dùng camelCase. PUT ghi đè toàn bộ: bắt buộc sleepSchedule (\"HH:mm–HH:mm\"), cleanliness (1-5) và socialStyle (ngoại hướng/extrovert, hướng nội/introvert, cân bằng/balanced); smoking và petFriendly bỏ trống sẽ lưu false; cookingFrequency, roomEnvironment, moveInDate bỏ trống/null lưu null; interests bỏ trống/null lưu mảng rỗng (tối đa 20 mục, mỗi mục 40 ký tự, không nhận phần tử null hoặc rỗng); budgetMin/budgetMax là VND và budgetMax phải >= budgetMin.")] SaveLifestylePreferencesRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await userService.SaveLifestylePreferencesAsync(userId, request, cancellationToken));
    }

    [Authorize]
    [EndpointSummary("Lấy nhu cầu nhà ở của tôi (onboarding)")]
    [EndpointDescription("Cần đăng nhập; user lấy từ access token nên không có tham số userId. 200 luôn trả HousingNeedsDto cho chính người gọi. Trường chưa khai là null, KHÔNG phải false: hasRoom và drinking là boolean? nên null = chưa khai còn false = câu trả lời \"không\". Dữ liệu này là riêng tư: danh sách hồ sơ và GET /api/users/{userId}/profile không trả các trường này. 401: thiếu hoặc hết hạn token; 404: tài khoản chưa có hồ sơ.")]
    [ProducesResponseType(404, Description = "Tài khoản chưa có hồ sơ; không phải lỗi dữ liệu của client.")]
    [ProducesResponseType(typeof(HousingNeedsDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("me/housing-needs")]
    public async Task<ActionResult<HousingNeedsDto>> GetMyHousingNeeds(CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var needs = await userService.GetHousingNeedsAsync(userId, cancellationToken);
        return needs is null ? NotFound() : Ok(needs);
    }

    [Authorize]
    [EndpointSummary("Lưu nhu cầu nhà ở (onboarding)")]
    [EndpointDescription("Cần đăng nhập; PUT ghi đè toàn bộ nhu cầu nhà ở của user trong token (upsert ở lần đầu), không nhận userId từ client và KHÔNG tạo tin phòng (rooms). hasRoom: true = đã có phòng, false = đang tìm phòng, null = chưa khai (bỏ trống lưu null, không mặc định false). occupationStatus: student | employed | both | other hoặc null; organizationName: tên trường/nơi làm việc tối đa 160 ký tự hoặc null và KHÔNG được suy ra từ occupation; hideOrganization: boolean, bỏ trống lưu false. drinking: true = có uống rượu bia, false = không, null = chưa khai. preferredDistance: lt_2km (< 2 km) | 2_5km | 5_10km | anywhere hoặc null. preferredRoomType: private (phòng riêng) | shared (phòng chung) | studio | whole_apartment (cả căn hộ) hoặc null. Khi hasRoom = true thì preferredDistance và preferredRoomType bắt buộc là null; nhờ PUT ghi đè toàn bộ nên chuyển trạng thái đã có phòng <-> đang tìm phòng không để lại dữ liệu mâu thuẫn. 200 trả dữ liệu đã lưu; 400: enum sai, chuỗi quá dài hoặc hasRoom = true kèm preferredDistance/preferredRoomType; 401: thiếu hoặc hết hạn token; 404: tài khoản chưa có hồ sơ.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(404, Description = "Tài khoản chưa có hồ sơ; không phải lỗi dữ liệu của client.")]
    [ProducesResponseType(typeof(HousingNeedsDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPut("me/housing-needs")]
    public async Task<ActionResult<HousingNeedsDto>> SaveMyHousingNeeds(
        [Description("JSON nhu cầu nhà ở, tên trường dùng camelCase. PUT ghi đè toàn bộ: hasRoom và drinking là boolean? (bỏ trống = null = chưa khai); occupationStatus chỉ nhận student/employed/both/other hoặc null; organizationName tối đa 160 ký tự hoặc null; hideOrganization bỏ trống = false; preferredDistance chỉ nhận lt_2km/2_5km/5_10km/anywhere hoặc null; preferredRoomType chỉ nhận private/shared/studio/whole_apartment hoặc null. preferredDistance và preferredRoomType phải là null khi hasRoom = true.")] SaveHousingNeedsRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var needs = await userService.SaveHousingNeedsAsync(userId, request, cancellationToken);
        return needs is null ? NotFound() : Ok(needs);
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
