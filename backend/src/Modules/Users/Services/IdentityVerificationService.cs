using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using RoomieMatch.Shared.Contracts;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Users.Services;

// Member side of identity verification. Images are uploaded first through
// POST /api/media/images (purpose=verification); this service only accepts URLs the caller
// uploaded there. Only the last four digits of the document number are stored. Moderators
// approve or reject through AdminService, which sets profiles.is_verified.
public sealed class IdentityVerificationService(
    IDbConnectionFactory connectionFactory,
    IUploadedImageVerifier uploadedImages)
{
    public async Task<VerificationStatusDto> GetMineAsync(Guid userId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT COALESCE((SELECT is_verified FROM profiles WHERE user_id = @user_id), false),
                   v.id, v.document_type, v.document_number_last4, v.status, v.rejection_reason,
                   v.created_at, v.reviewed_at
            FROM (SELECT 1) one
            LEFT JOIN LATERAL (
                SELECT * FROM identity_verifications
                WHERE user_id = @user_id
                ORDER BY created_at DESC, id DESC
                LIMIT 1) v ON true
            """;
        command.AddParameter("user_id", userId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        var latest = reader.IsDBNull(1)
            ? null
            : new VerificationSubmissionDto(
                reader.GetGuid(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.GetFieldValue<DateTimeOffset>(6),
                reader.IsDBNull(7) ? null : reader.GetFieldValue<DateTimeOffset>(7));
        return new VerificationStatusDto(reader.GetBoolean(0), latest);
    }

    public async Task<VerificationResult> SubmitAsync(
        Guid userId,
        SubmitVerificationRequest request,
        CancellationToken cancellationToken)
    {
        string[] images = [request.FrontImageUrl.Trim(), request.BackImageUrl.Trim(), request.SelfieImageUrl.Trim()];
        if (images.Distinct(StringComparer.Ordinal).Count() != images.Length
            || images.Any(url => !uploadedImages.IsUploadedBy(url, userId, ImagePurpose.Verification)))
        {
            return VerificationResult.Failure(VerificationError.InvalidImage);
        }

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        // Locks the profile so a submit cannot race a moderator approving the previous one.
        await using (var profile = connection.CreateCommand())
        {
            profile.Transaction = transaction;
            profile.CommandText = "SELECT is_verified FROM profiles WHERE user_id = @user_id FOR UPDATE";
            profile.AddParameter("user_id", userId);
            switch (await profile.ExecuteScalarAsync(cancellationToken))
            {
                case null:
                    return VerificationResult.Failure(VerificationError.ProfileMissing);
                case true:
                    return VerificationResult.Failure(VerificationError.AlreadyVerified);
            }
        }

        // ux_identity_verifications_one_pending also guards this; the WHERE keeps it a clean 409.
        await using var insert = connection.CreateCommand();
        insert.Transaction = transaction;
        insert.CommandText = """
            INSERT INTO identity_verifications
                (user_id, document_type, document_number_last4, front_image_url, back_image_url, selfie_image_url)
            SELECT @user_id, @document_type, @last4, @front, @back, @selfie
            WHERE NOT EXISTS (
                SELECT 1 FROM identity_verifications WHERE user_id = @user_id AND status = 'pending')
            RETURNING id, document_type, document_number_last4, status, rejection_reason, created_at, reviewed_at
            """;
        insert
            .AddParameter("user_id", userId)
            .AddParameter("document_type", request.DocumentType)
            .AddParameter("last4", request.DocumentNumberLast4)
            .AddParameter("front", images[0])
            .AddParameter("back", images[1])
            .AddParameter("selfie", images[2]);

        VerificationSubmissionDto submission;
        await using (var reader = await insert.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                return VerificationResult.Failure(VerificationError.AlreadyPending);
            }

            submission = new VerificationSubmissionDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.GetFieldValue<DateTimeOffset>(5),
                reader.IsDBNull(6) ? null : reader.GetFieldValue<DateTimeOffset>(6));
        }

        await transaction.CommitAsync(cancellationToken);
        return VerificationResult.Success(submission);
    }
}

public enum VerificationError
{
    None,
    // An image URL was not uploaded by this member with purpose=verification, or two are the same.
    InvalidImage,
    // Onboarding has not created a profile yet, so there is nothing to mark verified.
    ProfileMissing,
    AlreadyVerified,
    AlreadyPending
}

public sealed record VerificationResult(VerificationError Error, VerificationSubmissionDto? Value)
{
    public static VerificationResult Success(VerificationSubmissionDto value) => new(VerificationError.None, value);

    public static VerificationResult Failure(VerificationError error) => new(error, null);
}

public sealed record VerificationStatusDto(
    [property: Description("true khi hồ sơ đã được kiểm duyệt viên xác minh.")] bool IsVerified,
    [property: Description("Lần gửi gần nhất; null nếu chưa gửi lần nào.")] VerificationSubmissionDto? Latest);

public sealed record VerificationSubmissionDto(
    Guid Id,
    [property: Description("cccd hoặc cmnd.")] string DocumentType,
    [property: Description("4 số cuối giấy tờ; số đầy đủ không được lưu.")] string DocumentNumberLast4,
    [property: Description("pending (chờ duyệt), approved hoặc rejected.")] string Status,
    [property: Description("Lý do từ chối khi status=rejected; gửi lại hồ sơ mới sau khi sửa.")] string? RejectionReason,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReviewedAt);

public sealed record SubmitVerificationRequest(
    [Required, AllowedValues("cccd", "cmnd")]
    [property: Description("Loại giấy tờ: cccd hoặc cmnd.")]
    string DocumentType,
    [Required, RegularExpression("^[0-9]{4}$")]
    [property: Description("Đúng 4 số cuối của số giấy tờ; không gửi số đầy đủ.")]
    string DocumentNumberLast4,
    [Required, StringLength(500)]
    [property: Description("URL ảnh mặt trước, lấy từ POST /api/media/images với purpose=verification.")]
    string FrontImageUrl,
    [Required, StringLength(500)]
    [property: Description("URL ảnh mặt sau, lấy từ POST /api/media/images với purpose=verification.")]
    string BackImageUrl,
    [Required, StringLength(500)]
    [property: Description("URL ảnh chân dung cầm giấy tờ, lấy từ POST /api/media/images với purpose=verification.")]
    string SelfieImageUrl);
