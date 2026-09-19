using System.Data.Common;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Hyperlocal.Services;

public sealed class HyperlocalService(IDbConnectionFactory connectionFactory) : IHyperlocalService
{
    private const string ServiceColumns = """
        id, category, name, description, phone, district, city,
        distance_km, rating, review_count, price_from, is_verified
        """;

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
        var sql = $"""
            SELECT {ServiceColumns}
            FROM local_services
            WHERE city = @city
              AND (@district IS NULL OR district = @district)
              AND deleted_at IS NULL
            ORDER BY is_verified DESC, distance_km, rating DESC
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("city", city);

        var districtParameter = command.CreateParameter();
        districtParameter.ParameterName = "district";
        districtParameter.DbType = System.Data.DbType.String;
        districtParameter.Value = string.IsNullOrWhiteSpace(district) ? DBNull.Value : district;
        command.Parameters.Add(districtParameter);

        return await ReadServicesAsync(command, cancellationToken);
    }

    public async Task<LocalServiceDto?> GetServiceAsync(Guid serviceId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        return await ReadServiceAsync(connection, serviceId, cancellationToken);
    }

    public async Task<LocalServiceDto> CreateServiceAsync(
        SaveLocalServiceRequest request,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO local_services
                (category, name, description, phone, district, city,
                 distance_km, rating, review_count, price_from, is_verified)
            VALUES
                (@category, @name, @description, @phone, @district, @city,
                 @distance_km, @rating, @review_count, @price_from, @is_verified)
            RETURNING id
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        AddServiceParameters(command, request);

        var serviceId = (Guid)(await command.ExecuteScalarAsync(cancellationToken))!;
        return (await ReadServiceAsync(connection, serviceId, cancellationToken))!;
    }

    public async Task<LocalServiceDto?> UpdateServiceAsync(
        Guid serviceId,
        SaveLocalServiceRequest request,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE local_services SET
                category = @category,
                name = @name,
                description = @description,
                phone = @phone,
                district = @district,
                city = @city,
                distance_km = @distance_km,
                rating = @rating,
                review_count = @review_count,
                price_from = @price_from,
                is_verified = @is_verified
            WHERE id = @service_id AND deleted_at IS NULL
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("service_id", serviceId);
        AddServiceParameters(command, request);

        if (await command.ExecuteNonQueryAsync(cancellationToken) == 0)
        {
            return null;
        }

        return await ReadServiceAsync(connection, serviceId, cancellationToken);
    }

    public async Task<bool> DeleteServiceAsync(Guid serviceId, CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE local_services SET deleted_at = now()
            WHERE id = @service_id AND deleted_at IS NULL
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("service_id", serviceId);

        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    private static void AddServiceParameters(DbCommand command, SaveLocalServiceRequest request)
    {
        command
            .AddParameter("category", request.Category.Trim())
            .AddParameter("name", request.Name.Trim())
            .AddParameter("description", Normalize(request.Description))
            .AddParameter("phone", Normalize(request.Phone))
            .AddParameter("district", request.District.Trim())
            .AddParameter("city", request.City.Trim())
            .AddParameter("distance_km", request.DistanceKm!.Value)
            .AddParameter("rating", request.Rating!.Value)
            .AddParameter("review_count", request.ReviewCount)
            .AddParameter("price_from", request.PriceFrom)
            .AddParameter("is_verified", request.IsVerified ?? false);
    }

    private static async Task<LocalServiceDto?> ReadServiceAsync(
        DbConnection connection,
        Guid serviceId,
        CancellationToken cancellationToken)
    {
        var sql = $"""
            SELECT {ServiceColumns}
            FROM local_services
            WHERE id = @service_id AND deleted_at IS NULL
            """;

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("service_id", serviceId);

        var services = await ReadServicesAsync(command, cancellationToken);
        return services.Count == 0 ? null : services[0];
    }

    private static async Task<IReadOnlyList<LocalServiceDto>> ReadServicesAsync(
        DbCommand command,
        CancellationToken cancellationToken)
    {
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

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
