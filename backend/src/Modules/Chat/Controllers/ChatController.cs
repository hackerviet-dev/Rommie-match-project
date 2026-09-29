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
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(chatService.GetModuleStatus());
    }

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
    [HttpPost("conversations")]
    public async Task<ActionResult<ConversationDto>> StartConversation(
        StartConversationRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return ToActionResult(await chatService.StartConversationAsync(userId, request.UserId!.Value, cancellationToken));
    }

    [HttpGet("conversations/{conversationId:guid}")]
    public async Task<ActionResult<ConversationDto>> GetConversation(
        Guid conversationId,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        var conversation = await chatService.GetConversationAsync(userId, conversationId, cancellationToken);
        return conversation is null ? ChatProblem(ChatError.NotFound) : Ok(conversation);
    }

    [HttpGet("conversations/{conversationId:guid}/messages")]
    public async Task<ActionResult<MessagePage>> GetMessages(
        Guid conversationId,
        [FromQuery] MessagePageQuery query,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return ToActionResult(await chatService.GetMessagesAsync(userId, conversationId, query, cancellationToken));
    }

    [HttpPost("conversations/{conversationId:guid}/messages")]
    public async Task<ActionResult<MessageDto>> SendMessage(
        Guid conversationId,
        SendMessageRequest request,
        CancellationToken cancellationToken)
    {
        if (User.GetUserId() is not { } userId)
        {
            return Unauthorized();
        }

        return ToActionResult(
            await chatService.SendMessageAsync(userId, conversationId, request.Content, cancellationToken));
    }

    [HttpPost("conversations/{conversationId:guid}/read")]
    public async Task<ActionResult<ReadReceiptDto>> MarkRead(
        Guid conversationId,
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
