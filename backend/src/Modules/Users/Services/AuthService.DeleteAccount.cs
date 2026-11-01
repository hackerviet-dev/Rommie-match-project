using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Users.Services;

public sealed partial class AuthService
{
    /// Days a member-requested deletion stays restorable before DeletedAccountPurgeService removes it.
    public const int SelfDeletionGraceDays = 30;

    // A member deleting their own account goes through the same soft delete as staff
    // (deleted_at, sessions revoked, live rooms hidden) with deleted_by = the member, which
    // marks the row for the automatic hard delete after SelfDeletionGraceDays.
    public async Task<AuthError> DeleteOwnAccountAsync(Guid userId, DeleteAccountRequest request, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using (var select = connection.CreateCommand())
        {
            select.Transaction = transaction;
            select.CommandText = "SELECT email, password_hash, role FROM users WHERE id = @user_id AND is_active AND deleted_at IS NULL FOR UPDATE";
            select.AddParameter("user_id", userId);
            await using var reader = await select.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return AuthError.AccountDisabled;
            }

            // Staff accounts are removed by another admin, so the last admin cannot vanish by accident.
            if (reader.GetString(2) != "member")
            {
                return AuthError.StaffSelfDeleteForbidden;
            }

            if (!string.Equals(reader.GetString(0), request.ConfirmEmail.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return AuthError.DeletionEmailMismatch;
            }

            // Google-only accounts have no password; the typed email is their confirmation.
            if (!reader.IsDBNull(1)
                && (string.IsNullOrEmpty(request.Password) || !passwordHashService.Verify(reader.GetString(1), request.Password)))
            {
                return AuthError.DeletionPasswordInvalid;
            }
        }

        await using (var delete = connection.CreateCommand())
        {
            delete.Transaction = transaction;
            delete.CommandText = """
                UPDATE users SET deleted_at = now(), deleted_by = @user_id, updated_at = now() WHERE id = @user_id;
                UPDATE rooms SET deleted_at = now() WHERE owner_user_id = @user_id AND deleted_at IS NULL;
                INSERT INTO staff_audit_logs (actor_id, action, target_id, note)
                VALUES (@user_id, 'account.self_delete', @user_id, 'Thành viên tự yêu cầu xóa tài khoản.');
                """;
            delete.AddParameter("user_id", userId);
            await delete.ExecuteNonQueryAsync(cancellationToken);
        }

        await RevokeAllForUserAsync(connection, transaction, userId, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return AuthError.None;
    }
}
