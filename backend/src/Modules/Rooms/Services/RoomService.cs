using System.Data.Common;
using System.Text;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Rooms.Services;

public sealed class RoomService(IDbConnectionFactory connectionFactory) : IRoomService
{
    private const string RoomColumns = """
        r.id, r.owner_user_id, p.display_name, p.avatar_url, r.title, r.description,
        r.address, r.district, r.city, r.monthly_rent, r.deposit, r.available_from,
        r.max_occupants, r.amenities, r.latitude, r.longitude, r.is_active,
        r.created_at, r.updated_at
        """;

    public object GetModuleStatus()
    {
        return new
        {
            module = "Rooms",
            features = new[] { "listings", "search", "owner-management" }
        };
    }

    public async Task<IReadOnlyList<RoomDto>> SearchAsync(
        RoomSearchQuery query,
        CancellationToken cancellationToken)
    {
        var filters = new StringBuilder("WHERE r.is_active = true AND r.deleted_at IS NULL");
        if (!string.IsNullOrWhiteSpace(query.City))
        {
            filters.Append(" AND r.city = @city");
        }

        if (!string.IsNullOrWhiteSpace(query.District))
        {
            filters.Append(" AND r.district = @district");
        }

        if (query.MaxRent is not null)
        {
            filters.Append(" AND r.monthly_rent <= @max_rent");
        }

        if (query.AvailableBy is not null)
        {
            filters.Append(" AND r.available_from <= @available_by");
        }

        var sql = $"""
            SELECT {RoomColumns}
            FROM rooms r
            INNER JOIN profiles p ON p.user_id = r.owner_user_id
            {filters}
            ORDER BY r.available_from, r.monthly_rent
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        if (!string.IsNullOrWhiteSpace(query.City))
        {
            command.AddParameter("city", query.City.Trim());
        }

        if (!string.IsNullOrWhiteSpace(query.District))
        {
            command.AddParameter("district", query.District.Trim());
        }

        if (query.MaxRent is not null)
        {
            command.AddParameter("max_rent", query.MaxRent.Value);
        }

        if (query.AvailableBy is not null)
        {
            command.AddParameter("available_by", query.AvailableBy.Value);
        }

        return await ReadRoomsAsync(command, cancellationToken);
    }

    public async Task<IReadOnlyList<RoomDto>> GetOwnedByAsync(
        Guid ownerUserId,
        CancellationToken cancellationToken)
    {
        var sql = $"""
            SELECT {RoomColumns}
            FROM rooms r
            INNER JOIN profiles p ON p.user_id = r.owner_user_id
            WHERE r.owner_user_id = @owner_user_id AND r.deleted_at IS NULL
            ORDER BY r.is_active DESC, r.created_at DESC
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("owner_user_id", ownerUserId);

        return await ReadRoomsAsync(command, cancellationToken);
    }

    public async Task<RoomDto?> GetAsync(Guid roomId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        return await ReadRoomAsync(connection, roomId, cancellationToken);
    }

    public async Task<RoomDto> CreateAsync(
        Guid ownerUserId,
        SaveRoomRequest request,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO rooms
                (owner_user_id, title, description, address, district, city, monthly_rent,
                 deposit, available_from, max_occupants, amenities, latitude, longitude, is_active)
            VALUES
                (@owner_user_id, @title, @description, @address, @district, @city, @monthly_rent,
                 @deposit, @available_from, @max_occupants, @amenities, @latitude, @longitude, @is_active)
            RETURNING id
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("owner_user_id", ownerUserId);
        AddRoomParameters(command, request);

        var roomId = (Guid)(await command.ExecuteScalarAsync(cancellationToken))!;
        return (await ReadRoomAsync(connection, roomId, cancellationToken))!;
    }

    public async Task<RoomWriteResult> UpdateAsync(
        Guid roomId,
        Guid ownerUserId,
        SaveRoomRequest request,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE rooms SET
                title = @title,
                description = @description,
                address = @address,
                district = @district,
                city = @city,
                monthly_rent = @monthly_rent,
                deposit = @deposit,
                available_from = @available_from,
                max_occupants = @max_occupants,
                amenities = @amenities,
                latitude = @latitude,
                longitude = @longitude,
                is_active = @is_active
            WHERE id = @room_id AND owner_user_id = @owner_user_id AND deleted_at IS NULL
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("room_id", roomId);
        command.AddParameter("owner_user_id", ownerUserId);
        AddRoomParameters(command, request);

        if (await command.ExecuteNonQueryAsync(cancellationToken) == 0)
        {
            return RoomWriteResult.Failure(
                await ClassifyMissingWriteAsync(connection, roomId, cancellationToken));
        }

        return RoomWriteResult.Success((await ReadRoomAsync(connection, roomId, cancellationToken))!);
    }

    public async Task<RoomWriteError> DeleteAsync(
        Guid roomId,
        Guid ownerUserId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE rooms SET deleted_at = now()
            WHERE id = @room_id AND owner_user_id = @owner_user_id AND deleted_at IS NULL
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("room_id", roomId);
        command.AddParameter("owner_user_id", ownerUserId);

        return await command.ExecuteNonQueryAsync(cancellationToken) == 0
            ? await ClassifyMissingWriteAsync(connection, roomId, cancellationToken)
            : RoomWriteError.None;
    }

    // A write matching zero rows means the room is gone, or it belongs to somebody else.
    private static async Task<RoomWriteError> ClassifyMissingWriteAsync(
        DbConnection connection,
        Guid roomId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT 1 FROM rooms WHERE id = @room_id AND deleted_at IS NULL";
        command.AddParameter("room_id", roomId);

        return await command.ExecuteScalarAsync(cancellationToken) is null
            ? RoomWriteError.NotFound
            : RoomWriteError.NotOwner;
    }

    private static void AddRoomParameters(DbCommand command, SaveRoomRequest request)
    {
        command
            .AddParameter("title", request.Title.Trim())
            .AddParameter("description", Normalize(request.Description))
            .AddParameter("address", request.Address.Trim())
            .AddParameter("district", request.District.Trim())
            .AddParameter("city", request.City.Trim())
            .AddParameter("monthly_rent", request.MonthlyRent!.Value)
            .AddParameter("deposit", request.Deposit)
            .AddParameter("available_from", request.AvailableFrom!.Value)
            .AddParameter("max_occupants", (short)request.MaxOccupants)
            .AddParameter("amenities", NormalizeAmenities(request.Amenities))
            .AddParameter("latitude", request.Latitude)
            .AddParameter("longitude", request.Longitude)
            .AddParameter("is_active", request.IsActive ?? true);
    }

    private static async Task<RoomDto?> ReadRoomAsync(
        DbConnection connection,
        Guid roomId,
        CancellationToken cancellationToken)
    {
        var sql = $"""
            SELECT {RoomColumns}
            FROM rooms r
            INNER JOIN profiles p ON p.user_id = r.owner_user_id
            WHERE r.id = @room_id AND r.deleted_at IS NULL
            """;

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.AddParameter("room_id", roomId);

        var rooms = await ReadRoomsAsync(command, cancellationToken);
        return rooms.Count == 0 ? null : rooms[0];
    }

    private static async Task<IReadOnlyList<RoomDto>> ReadRoomsAsync(
        DbCommand command,
        CancellationToken cancellationToken)
    {
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var rooms = new List<RoomDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            rooms.Add(new RoomDto(
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.GetString(6),
                reader.GetString(7),
                reader.GetString(8),
                reader.GetInt32(9),
                reader.GetInt32(10),
                reader.GetFieldValue<DateOnly>(11),
                reader.GetInt16(12),
                reader.GetFieldValue<string[]>(13),
                reader.IsDBNull(14) ? null : reader.GetDecimal(14),
                reader.IsDBNull(15) ? null : reader.GetDecimal(15),
                reader.GetBoolean(16),
                reader.GetFieldValue<DateTimeOffset>(17),
                reader.GetFieldValue<DateTimeOffset>(18)));
        }

        return rooms;
    }

    private static string[] NormalizeAmenities(string[]? amenities)
    {
        if (amenities is null)
        {
            return [];
        }

        return amenities
            .Select(amenity => amenity.Trim())
            .Where(amenity => amenity.Length > 0)
            .Distinct()
            .ToArray();
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
