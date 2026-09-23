using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.OpenApi;
using RoomieMatch.Bootstrapper.Infrastructure;
using RoomieMatch.Modules.Billing;
using RoomieMatch.Modules.Hyperlocal;
using RoomieMatch.Modules.Matching;
using RoomieMatch.Modules.Rooms;
using RoomieMatch.Modules.Users;
using RoomieMatch.Shared.Data;

var builder = WebApplication.CreateBuilder(args);

var postgresConnectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");

builder.Services.AddSingleton<IDbConnectionFactory>(
    new PostgresConnectionFactory(postgresConnectionString));
builder.Services.AddHealthChecks()
    .AddCheck<PostgresHealthCheck>("postgres");
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true)));

builder.Services.AddControllers()
    .AddApplicationPart(typeof(UsersModule).Assembly)
    .AddApplicationPart(typeof(MatchingModule).Assembly)
    .AddApplicationPart(typeof(HyperlocalModule).Assembly)
    .AddApplicationPart(typeof(RoomsModule).Assembly)
    .AddApplicationPart(typeof(BillingModule).Assembly);

builder.Services
    .AddUsersModule(builder.Configuration)
    .AddMatchingModule(builder.Configuration)
    .AddHyperlocalModule(builder.Configuration)
    .AddRoomsModule(builder.Configuration)
    .AddBillingModule(builder.Configuration);

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
            + "Chat realtime nam o service Go rieng (WebSocket /ws), khong nam trong tai lieu nay.";
        return Task.CompletedTask;
    });
    options.AddOperationTransformer<AuthorizeRequirementTransformer>();
});

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
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
}));

app.MapControllers();
app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => true
});

app.Run();
