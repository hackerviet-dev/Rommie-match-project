using RoomieMatch.Modules.Users.Services;
using RoomieMatch.Shared.Authentication;

namespace RoomieMatch.Bootstrapper.Infrastructure;

public sealed class OnboardingMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, OnboardingService service)
    {
        var path = context.Request.Path;
        var onboarding = path.Equals(new PathString("/api/users/me/onboarding")) && (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsPut(context.Request.Method));
        var ownProfile = path.Equals(new PathString("/api/users/me/profile")) && HttpMethods.IsGet(context.Request.Method);
        var onboardingQuiz = (path.Equals(new PathString("/api/matching/quiz")) && HttpMethods.IsGet(context.Request.Method))
            || (path.Equals(new PathString("/api/matching/me/quiz")) && (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsPut(context.Request.Method)));
        if (context.User.Identity?.IsAuthenticated == true && context.User.GetUserId() is { } id
            && !context.User.IsInRole("admin") && !context.User.IsInRole("moderator")
            && (path.StartsWithSegments("/api") || path.StartsWithSegments("/hubs"))
            && !path.StartsWithSegments("/api/auth") && !path.StartsWithSegments("/api/geo") && !onboarding && !ownProfile && !onboardingQuiz
            && !await service.IsCompleteAsync(id, context.RequestAborted))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { code = "onboarding_required", detail = "Vui lòng hoàn thành hồ sơ trước khi sử dụng hệ thống." }, context.RequestAborted);
            return;
        }
        await next(context);
    }
}
