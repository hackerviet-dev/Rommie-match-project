using System.Data.Common;
using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Hyperlocal.Services;

public sealed class ServiceBookingService(IDbConnectionFactory connectionFactory) : IServiceBookingService
{
    private const string BookingColumns = """
        b.id, b.service_id, s.name, s.category, s.phone, b.scheduled_at, b.address,
        b.contact_phone, b.note, b.status, b.cancelled_at, b.created_at, b.updated_at
        """;

    // A deleted service stays joined so the member still sees what they booked.
    private const string BookingFrom = """
        FROM service_bookings b
        INNER JOIN local_services s ON s.id = b.service_id
        """;

    public async Task<ServiceBookingDto?> CreateAsync(
        Guid userId,
        Guid serviceId,
        CreateServiceBookingRequest request,
        CancellationToken cancellationToken)
    {
        // Inserting from the service row makes "service gone" and "insert" one atomic step.
        const string sql = """
            INSERT INTO service_bookings (service_id, user_id, scheduled_at, address, contact_phone, note)
            SELECT id, @user_id, @scheduled_at, @address, @contact_phone, @note
            FROM local_services
            WHERE id = @service_id AND deleted_at IS NULL
            RETURNING id
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command
            .AddParameter("service_id", serviceId)
            .AddParameter("user_id", userId)
            .AddParameter("scheduled_at", request.ScheduledAt!.Value.ToUniversalTime())
            .AddParameter("address", request.Address.Trim())
            .AddParameter("contact_phone", request.ContactPhone.Trim())
            .AddParameter("note", string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim());

        if (await command.ExecuteScalarAsync(cancellationToken) is not Guid bookingId)
        {
            return null;
        }

        return await ReadBookingAsync(connection, userId, bookingId, cancellationToken);
    }

    public async Task<PagedResult<ServiceBookingDto>> GetMineAsync(
        Guid userId,
        PageQuery paging,
        CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);

        await using var countCommand = connection.CreateCommand();
        countCommand.CommandText = "SELECT count(*) FROM service_bookings WHERE user_id = @user_id";
        countCommand.AddParameter("user_id", userId);
        var totalCount = (int)(long)(await countCommand.ExecuteScalarAsync(cancellationToken))!;

        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT {BookingColumns}
            {BookingFrom}
            WHERE b.user_id = @user_id
            ORDER BY b.created_at DESC, b.id
            LIMIT @limit OFFSET @offset
            """;
        command
            .AddParameter("user_id", userId)
            .AddParameter("limit", paging.PageSize)
            .AddParameter("offset", paging.Offset);

        var bookings = await ReadBookingsAsync(command, cancellationToken);
        return new PagedResult<ServiceBookingDto>(bookings, paging.Page, paging.PageSize, totalCount);
    }

    public async Task<ServiceBookingDto?> GetMineAsync(
        Guid userId,
        Guid bookingId,
        CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        return await ReadBookingAsync(connection, userId, bookingId, cancellationToken);
    }

    // Only a booking that has not happened yet and was not already finished can be
    // cancelled. The checks sit in the UPDATE itself so two concurrent requests
    // cannot both pass them.
    public async Task<BookingCancelResult> CancelAsync(
        Guid userId,
        Guid bookingId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE service_bookings
            SET status = 'cancelled', cancelled_at = now()
            WHERE id = @booking_id AND user_id = @user_id
              AND status IN ('pending', 'confirmed')
              AND scheduled_at > now()
            """;

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command
            .AddParameter("booking_id", bookingId)
            .AddParameter("user_id", userId);

        var cancelled = await command.ExecuteNonQueryAsync(cancellationToken) > 0;
        var booking = await ReadBookingAsync(connection, userId, bookingId, cancellationToken);
        if (booking is null)
        {
            return BookingCancelResult.Failure(BookingCancelError.NotFound);
        }

        return cancelled
            ? BookingCancelResult.Success(booking)
            : BookingCancelResult.Failure(BookingCancelError.NotCancellable);
    }

    private static async Task<ServiceBookingDto?> ReadBookingAsync(
        DbConnection connection,
        Guid userId,
        Guid bookingId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT {BookingColumns}
            {BookingFrom}
            WHERE b.id = @booking_id AND b.user_id = @user_id
            """;
        command
            .AddParameter("booking_id", bookingId)
            .AddParameter("user_id", userId);

        var bookings = await ReadBookingsAsync(command, cancellationToken);
        return bookings.Count == 0 ? null : bookings[0];
    }

    private static async Task<IReadOnlyList<ServiceBookingDto>> ReadBookingsAsync(
        DbCommand command,
        CancellationToken cancellationToken)
    {
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var bookings = new List<ServiceBookingDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            bookings.Add(new ServiceBookingDto(
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.GetFieldValue<DateTimeOffset>(5),
                reader.GetString(6),
                reader.GetString(7),
                reader.IsDBNull(8) ? null : reader.GetString(8),
                reader.GetString(9),
                reader.IsDBNull(10) ? null : reader.GetFieldValue<DateTimeOffset>(10),
                reader.GetFieldValue<DateTimeOffset>(11),
                reader.GetFieldValue<DateTimeOffset>(12)));
        }

        return bookings;
    }
}
