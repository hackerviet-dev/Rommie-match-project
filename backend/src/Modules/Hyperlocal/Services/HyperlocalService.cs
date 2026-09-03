using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Hyperlocal.Services;

public sealed class HyperlocalService(IDbConnectionFactory connectionFactory) : IHyperlocalService
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

    public async Task<IReadOnlyList<LocalServiceDto>> GetNearbyServicesAsync(
        string city,
        string? district,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id, category, name, description, phone, district, city,
                   distance_km, rating, review_count, price_from, is_verified
            FROM local_services
            WHERE city = @city AND (@district IS NULL OR district = @district)
            ORDER BY is_verified DESC, distance_km, rating DESC
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        var cityParameter = command.CreateParameter();
        cityParameter.ParameterName = "city";
        cityParameter.Value = city;
        command.Parameters.Add(cityParameter);
        var districtParameter = command.CreateParameter();
        districtParameter.ParameterName = "district";
        districtParameter.DbType = System.Data.DbType.String;
        districtParameter.Value = string.IsNullOrWhiteSpace(district) ? DBNull.Value : district;
        command.Parameters.Add(districtParameter);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var services = new List<LocalServiceDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            services.Add(new LocalServiceDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.GetString(5),
                reader.GetString(6),
                reader.GetDecimal(7),
                reader.GetDecimal(8),
                reader.GetInt32(9),
                reader.GetInt32(10),
                reader.GetBoolean(11)));
        }

        return services;
    }
}
