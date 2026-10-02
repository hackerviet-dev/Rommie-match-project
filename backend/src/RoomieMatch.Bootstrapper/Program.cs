using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.OpenApi;
using RoomieMatch.Bootstrapper.Infrastructure;
using RoomieMatch.Modules.Billing;
using RoomieMatch.Modules.Chat;
using RoomieMatch.Modules.Hyperlocal;
using RoomieMatch.Modules.Matching;
using RoomieMatch.Modules.Rooms;
using RoomieMatch.Modules.Users;
using RoomieMatch.Shared.Data;

var builder = WebApplication.CreateBuilder(args);

var postgresConnectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");

var migrateOnly = args.Contains("--migrate", StringComparer.Ordinal);
if (migrateOnly || builder.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    await DatabaseMigration.ApplyAsync(postgresConnectionString);
    if (migrateOnly)
        return;
}

builder.Services.AddSingleton<IDbConnectionFactory>(
    new PostgresConnectionFactory(postgresConnectionString));
builder.Services.AddHealthChecks()
    .AddCheck<PostgresHealthCheck>("postgres");
builder.Services.AddHttpHardening(builder.Configuration);

builder.Services.AddControllers()
    .AddApplicationPart(typeof(UsersModule).Assembly)
    .AddApplicationPart(typeof(MatchingModule).Assembly)
    .AddApplicationPart(typeof(HyperlocalModule).Assembly)
    .AddApplicationPart(typeof(RoomsModule).Assembly)
    .AddApplicationPart(typeof(BillingModule).Assembly)
    .AddApplicationPart(typeof(ChatModule).Assembly);

builder.Services
    .AddUsersModule(builder.Configuration)
    .AddMatchingModule(builder.Configuration)
    .AddHyperlocalModule(builder.Configuration)
    .AddRoomsModule(builder.Configuration)
    .AddBillingModule(builder.Configuration)
    .AddChatModule(builder.Configuration);

builder.Services.AddOpenApi(options =>
{
    // 3.0 thay vi 3.1 mac dinh: tooling mock/codegen cua frontend tuong thich rong hon.
    options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_0;
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Info.Title = "RoomieMatch API";
        document.Info.Version = "v1";
        document.Info.Description =
            "API cho ung dung tim ban cung phong RoomieMatch. "
            + "Chat realtime dung SignalR tai /hubs/chat (khong nam trong tai lieu nay); "
            + "lich su va gui tin qua REST o /api/chat.";
        return Task.CompletedTask;
    });
    options.AddOperationTransformer<AuthorizeRequirementTransformer>();
    options.AddSchemaTransformer<RequestRequiredFieldsTransformer>();
    options.AddOperationTransformer((operation, _, _) =>
    {
        // Offset is computed from page/pageSize, not an input for frontend callers.
        operation.Parameters = operation.Parameters?.Where(p => p.Name != "Offset").ToList();
        return Task.CompletedTask;
    });
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseCors();
app.UseAuthentication();
// After authentication so the global limit can be keyed on the signed-in user.
app.UseRateLimiter();
app.UseAuthorization();

app.MapOpenApi("/openapi/v1.json");
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "RoomieMatch API v1");
    options.RoutePrefix = "swagger";
    options.DocumentTitle = "RoomieMatch API";
});

app.MapGet("/", () => Results.Ok(new
{
    service = "RoomieMatch API",
    status = "ready"
}))
.WithSummary("Thông tin API RoomieMatch")
.WithDescription("API công khai, không có parameter/body. Trả tên dịch vụ và trạng thái ready; không kiểm tra database.");

app.MapControllers();
app.MapChatModule();
app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => true
})
.WithSummary("Kiểm tra sức khỏe API và PostgreSQL")
.WithDescription("API công khai, không có parameter/body. 200 với text Healthy khi database truy cập được; 503 khi kiểm tra thất bại. Dùng cho giám sát hạ tầng.");

app.Run();
