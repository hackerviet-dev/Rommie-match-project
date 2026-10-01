using Npgsql;

namespace RoomieMatch.Bootstrapper.Infrastructure;

internal static class DatabaseMigration
{
    public static async Task ApplyAsync(string connectionString)
    {
        var files = Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "Migrations"), "*.sql")
            .Order(StringComparer.Ordinal).ToArray();
        if (files.Length == 0)
            throw new InvalidOperationException("No packaged database migrations found.");

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        // Serialize overlapping deployments; the lock is released on commit or rollback.
        await using (var setup = new NpgsqlCommand("""
            SELECT pg_advisory_xact_lock(704123981);
            CREATE TABLE IF NOT EXISTS roomiematch_schema_migrations (
                name text PRIMARY KEY,
                applied_at timestamptz NOT NULL DEFAULT now()
            );
            """, connection, transaction))
        {
            await setup.ExecuteNonQueryAsync();
        }

        foreach (var file in files)
        {
            var name = Path.GetFileName(file);
            await using var applied = new NpgsqlCommand(
                "SELECT EXISTS (SELECT 1 FROM roomiematch_schema_migrations WHERE name = @name)",
                connection, transaction);
            applied.Parameters.AddWithValue("name", name);
            if ((bool)(await applied.ExecuteScalarAsync())!)
                continue;

            await using var migration = new NpgsqlCommand(await File.ReadAllTextAsync(file), connection, transaction)
            {
                CommandTimeout = 120
            };
            await migration.ExecuteNonQueryAsync();
            await using var record = new NpgsqlCommand(
                "INSERT INTO roomiematch_schema_migrations (name) VALUES (@name)", connection, transaction);
            record.Parameters.AddWithValue("name", name);
            await record.ExecuteNonQueryAsync();
            Console.WriteLine($"Applied database migration: {name}");
        }

        await transaction.CommitAsync();
        Console.WriteLine("Database migrations completed.");
    }
}
