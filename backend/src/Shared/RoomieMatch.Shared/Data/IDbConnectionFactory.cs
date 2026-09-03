using System.Data.Common;

namespace RoomieMatch.Shared.Data;

public interface IDbConnectionFactory
{
    ValueTask<DbConnection> OpenConnectionAsync(CancellationToken cancellationToken = default);
}
