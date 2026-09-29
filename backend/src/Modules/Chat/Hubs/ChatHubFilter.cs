using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using RoomieMatch.Shared.Authentication;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Chat.Hubs;

// Runs before every hub method call.
public sealed class ChatHubFilter : IHubFilter, IDisposable
{
    private readonly IDbConnectionFactory connectionFactory;
    private readonly PartitionedRateLimiter<string> limiter;

    public ChatHubFilter(IDbConnectionFactory connectionFactory, IOptions<ChatOptions> options)
    {
        this.connectionFactory = connectionFactory;
        var permitLimit = options.Value.HubInvocationsPerMinute;
        limiter = PartitionedRateLimiter.Create<string, string>(userId =>
            RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    }

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        var context = invocationContext.Context;
        var user = context.User;
        if (user?.GetUserId() is not { } userId)
        {
            throw new HubException("Phiên đăng nhập không hợp lệ.");
        }

        using var lease = limiter.AttemptAcquire(userId.ToString());
        if (!lease.IsAcquired)
        {
            throw new HubException("Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.");
        }

        // The token was checked when the socket opened, but a socket can outlive
        // "log out everywhere", a password change or a disabled account. Re-checking the
        // token version on each call stops such a connection from sending at once.
        if (!await IsTokenCurrentAsync(userId, user.FindFirst(ClaimsPrincipalExtensions.TokenVersionClaimType)?.Value, context.ConnectionAborted))
        {
            context.Abort();
            throw new HubException("Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.");
        }

        return await next(invocationContext);
    }

    public void Dispose()
    {
        limiter.Dispose();
    }

    private async Task<bool> IsTokenCurrentAsync(Guid userId, string? tokenVersionClaim, CancellationToken cancellationToken)
    {
        if (!int.TryParse(tokenVersionClaim, NumberStyles.Integer, CultureInfo.InvariantCulture, out var tokenVersion))
        {
            return false;
        }

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT token_version FROM users WHERE id = @user_id AND is_active = true";
        command.AddParameter("user_id", userId);

        return await command.ExecuteScalarAsync(cancellationToken) is int currentVersion
            && currentVersion == tokenVersion;
    }
}
