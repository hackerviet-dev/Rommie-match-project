using RoomieMatch.Modules.Hyperlocal;
using RoomieMatch.Modules.Matching;
using RoomieMatch.Modules.Users;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddApplicationPart(typeof(UsersModule).Assembly)
    .AddApplicationPart(typeof(MatchingModule).Assembly)
    .AddApplicationPart(typeof(HyperlocalModule).Assembly);

builder.Services
    .AddUsersModule(builder.Configuration)
    .AddMatchingModule(builder.Configuration)
    .AddHyperlocalModule(builder.Configuration);

var app = builder.Build();

app.MapGet("/", () => Results.Ok(new
{
    service = "RoomieMatch API",
    status = "ready"
}));

app.MapControllers();

app.Run();
