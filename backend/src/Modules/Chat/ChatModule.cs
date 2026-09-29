using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RoomieMatch.Modules.Chat.Hubs;
using RoomieMatch.Modules.Chat.Services;
using RoomieMatch.Shared.Contracts;
using RoomieMatch.Shared.Http;

namespace RoomieMatch.Modules.Chat;

public sealed class ChatModule : IModule
{
    public string Name => "Chat";
}

public static class ChatModuleExtensions
{
    public static IServiceCollection AddChatModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<ChatOptions>(configuration.GetSection(ChatOptions.SectionName));
        services.AddScoped<IChatService, ChatService>();

        // One filter instance so the per-user rate limit is shared by every connection.
        services.AddSingleton<ChatHubFilter>();
        services.AddSingleton<IUserIdProvider, SubjectUserIdProvider>();
        services.AddSignalR()
            .AddHubOptions<ChatHub>(options => options.AddFilter<ChatHubFilter>());

        // Connections are kept in this process's memory: running more than one API
        // instance needs a SignalR backplane (e.g. Redis) so events reach every instance.
        return services;
    }

    public static IEndpointRouteBuilder MapChatModule(this IEndpointRouteBuilder endpoints)
    {
        // Close the socket when the access token expires instead of keeping a signed-out
        // user connected; the client reconnects with a refreshed token.
        endpoints.MapHub<ChatHub>(HubPaths.Chat, options => options.CloseOnAuthenticationExpiration = true);
        return endpoints;
    }
}
