using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RoomieMatch.Modules.Chat.Services;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Chat.Controllers;

// REST covers history and works without a socket; sending here also pushes the message
// over SignalR, so a client may send either way.
[ApiController]
[Authorize]
[Route("api/chat")]
public sealed class ChatController(IChatService chatService) : ControllerBase
{
    [AllowAnonymous]
    [EndpointSummary("Thông tin module Chat")]
    [EndpointDescription("API công khai, không có parameter hoặc body. Trả thông tin cấu hình cố định của module; không kiểm tra database. Kiểm tra kết nối database bằng GET /health.")]
    [ProducesResponseType(200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(chatService.GetModuleStatus());
    }

    [EndpointSummary("Danh sách hội thoại của tôi")]
    [EndpointDescription("Cần đăng nhập. 200 trả PagedResult<ConversationDto>, hội thoại cập nhật gần nhất trước. isBlocked=true: khóa ô nhập; vẫn xem lịch sử.")]
    [ProducesResponseType(typeof(PagedResult<ConversationDto>), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("conversations")]
    public async Task<ActionResult<PagedResult<ConversationDto>>> GetConversations(
        [FromQuery] PageQuery paging,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return Ok(await chatService.GetConversationsAsync(userId, paging, cancellationToken));
    }

    // Opens (or reopens) the 1:1 conversation with a member.
    [EndpointSummary("Mở hội thoại riêng với một thành viên")]
    [EndpointDescription("Cần đăng nhập. Gửi userId người muốn nhắn. 200 trả ConversationDto; đã có hội thoại thì trả lại hội thoại cũ. 403: chính mình, người kia không hợp lệ hoặc có chặn.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(403, Description = "Không đủ quyền hoặc không thỏa điều kiện; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(typeof(ConversationDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("conversations")]
    public async Task<ActionResult<ConversationDto>> StartConversation(
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] StartConversationRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return ToActionResult(await chatService.StartConversationAsync(userId, request.UserId!.Value, cancellationToken));
    }

    [EndpointSummary("Xem thông tin một hội thoại")]
    [EndpointDescription("Cần đăng nhập. 200 trả ConversationDto; 404: không có hội thoại hoặc không phải thành viên.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(ConversationDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("conversations/{conversationId:guid}")]
    public async Task<ActionResult<ConversationDto>> GetConversation(
        [Description("UUID hội thoại, lấy từ id trong danh sách hội thoại.")] Guid conversationId,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var conversation = await chatService.GetConversationAsync(userId, conversationId, cancellationToken);
        return conversation is null ? ChatProblem(ChatError.NotFound) : Ok(conversation);
    }

    [EndpointSummary("Tải lịch sử tin nhắn")]
    [EndpointDescription("Cần đăng nhập. 200 trả {items, hasMore}, tin mới nhất trước. Để tải cũ hơn, truyền beforeId là id tin cũ nhất đang có; limit mặc định 30, tối đa 50. 404: không phải thành viên. beforeId không tồn tại hoặc thuộc hội thoại khác trả danh sách rỗng.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(MessagePage), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpGet("conversations/{conversationId:guid}/messages")]
    public async Task<ActionResult<MessagePage>> GetMessages(
        [Description("UUID hội thoại, lấy từ id trong danh sách hội thoại.")] Guid conversationId,
        [FromQuery] MessagePageQuery query,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return ToActionResult(await chatService.GetMessagesAsync(userId, conversationId, query, cancellationToken));
    }

    [EndpointSummary("Gửi tin nhắn qua REST")]
    [EndpointDescription("Cần đăng nhập. Gửi JSON {content}, 1-4000 ký tự sau trim. 200 trả MessageDto; tin cũng được đẩy realtime qua SignalR /hubs/chat. 400: nội dung sai; 403: có chặn; 404: không phải thành viên. Ghép tin theo id để tránh hiển thị trùng REST và realtime.")]
    [ProducesResponseType(400, Description = "Dữ liệu đầu vào không hợp lệ; xem chi tiết lỗi và các trường trong response.")]
    [ProducesResponseType(403, Description = "Không đủ quyền hoặc không thỏa điều kiện; xem mô tả endpoint và code lỗi nếu có.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(MessageDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("conversations/{conversationId:guid}/messages")]
    public async Task<ActionResult<MessageDto>> SendMessage(
        [Description("UUID hội thoại, lấy từ id trong danh sách hội thoại.")] Guid conversationId,
        [Description("JSON theo schema bên dưới; tên trường dùng camelCase.")] SendMessageRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return ToActionResult(
            await chatService.SendMessageAsync(userId, conversationId, request.Content, cancellationToken));
    }

    [EndpointSummary("Đánh dấu hội thoại đã đọc")]
    [EndpointDescription("Cần đăng nhập; không có body. 200 trả ReadReceiptDto và phát sự kiện ConversationRead qua SignalR. 404: không phải thành viên.")]
    [ProducesResponseType(404, Description = "Không tìm thấy dữ liệu hoặc không được phép xem dữ liệu này.")]
    [ProducesResponseType(typeof(ReadReceiptDto), 200, Description = "Thành công; dữ liệu trả về theo schema bên dưới.")]
    [HttpPost("conversations/{conversationId:guid}/read")]
    public async Task<ActionResult<ReadReceiptDto>> MarkRead(
        [Description("UUID hội thoại, lấy từ id trong danh sách hội thoại.")] Guid conversationId,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return ToActionResult(await chatService.MarkReadAsync(userId, conversationId, cancellationToken));
    }

    private ActionResult ToActionResult<T>(ChatResult<T> result)
    {
        return result.Error == ChatError.None ? Ok(result.Value) : ChatProblem(result.Error);
    }

    private ObjectResult ChatProblem(ChatError error)
    {
        var status = error switch
        {
            ChatError.NotFound => StatusCodes.Status404NotFound,
            ChatError.InvalidContent => StatusCodes.Status400BadRequest,
            _ => StatusCodes.Status403Forbidden
        };

        return Problem(ChatErrors.Message(error), statusCode: status);
    }
}
