namespace RoomieMatch.Modules.Hyperlocal.Services;

public sealed class HyperlocalService : IHyperlocalService
{
    public object GetModuleStatus()
    {
        return new
        {
            module = "Hyperlocal",
            radiusMeters = 1000,
            features = new[] { "nearby-services", "local-deals", "building-community" }
        };
    }
}
