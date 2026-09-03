using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using RoomieMatch.Bootstrapper.Infrastructure;
using RoomieMatch.Modules.Hyperlocal;
using RoomieMatch.Modules.Matching;
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
    .AddApplicationPart(typeof(HyperlocalModule).Assembly);

builder.Services
    .AddUsersModule(builder.Configuration)
    .AddMatchingModule(builder.Configuration)
    .AddHyperlocalModule(builder.Configuration);

var app = builder.Build();

app.UseCors();

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
