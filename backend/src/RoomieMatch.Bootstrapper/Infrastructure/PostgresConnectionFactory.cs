using System.Data.Common;
using Npgsql;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Bootstrapper.Infrastructure;

public sealed class PostgresConnectionFactory(string connectionString) : IDbConnectionFactory
{
    public async ValueTask<DbConnection> OpenConnectionAsync(CancellationToken cancellationToken = default)
    {
        var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }
}
