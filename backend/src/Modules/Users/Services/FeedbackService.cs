using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Users.Services;

// Product feedback: members send it, staff read it and mark it reviewed. Nothing here
// acts on another member, so there is no blocking or moderation side effect.
public sealed class FeedbackService(IDbConnectionFactory factory)
{
    // A member can send this many items per rolling hour; enough for real use, not for flooding the queue.
    public const int HourlyLimit = 5;

    // Returns null when the caller is over the hourly limit.
    public async Task<FeedbackDto?> CreateAsync(Guid userId, CreateFeedbackRequest request, CancellationToken ct)
    {
        await using var c = await factory.OpenConnectionAsync(ct);
        await using var cmd = c.CreateCommand();
        // The count and insert share one statement so two quick submits cannot both slip past the limit check.
        cmd.CommandText = """
            INSERT INTO user_feedback (user_id, category, rating, message, page_path)
            SELECT @user, @category, @rating, @message, @path
            WHERE (SELECT count(*) FROM user_feedback
                   WHERE user_id = @user AND created_at > now() - interval '1 hour') < @limit
            RETURNING id, category, rating, message, status, created_at
            """;
        cmd.AddParameter("user", userId).AddParameter("category", request.Category)
            .AddParameter("rating", request.Rating is { } rating ? (short)rating : null)
            .AddParameter("message", request.Message.Trim())
            .AddParameter("path", string.IsNullOrWhiteSpace(request.PagePath) ? null : request.PagePath.Trim())
            .AddParameter("limit", HourlyLimit);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return null;
        return new FeedbackDto(r.GetGuid(0), r.GetString(1), r.IsDBNull(2) ? null : r.GetInt16(2), r.GetString(3),
            r.GetString(4), r.GetFieldValue<DateTimeOffset>(5));
    }

    public async Task<PagedResult<AdminFeedbackDto>> ListAsync(string? status, string? category, PageQuery paging, CancellationToken ct)
    {
        const string fromWhere = """
            FROM user_feedback f
            LEFT JOIN users u ON u.id = f.user_id
            LEFT JOIN profiles p ON p.user_id = f.user_id
            LEFT JOIN profiles rp ON rp.user_id = f.reviewed_by
            WHERE (CAST(@status AS text) IS NULL OR f.status = @status)
              AND (CAST(@category AS text) IS NULL OR f.category = @category)
            """;
        await using var c = await factory.OpenConnectionAsync(ct);
        await using var count = c.CreateCommand();
        count.CommandText = $"SELECT count(*) {fromWhere}";
        count.AddParameter("status", status).AddParameter("category", category);
        var totalCount = checked((int)(long)(await count.ExecuteScalarAsync(ct))!);
        await using var cmd = c.CreateCommand();
        cmd.CommandText = $"""
            SELECT f.id, f.user_id, p.display_name, u.email, f.category, f.rating, f.message, f.page_path,
                   f.status, f.staff_note, rp.display_name, f.reviewed_at, f.created_at
            {fromWhere}
            ORDER BY f.created_at DESC, f.id DESC LIMIT @limit OFFSET @offset
            """;
        cmd.AddParameter("status", status).AddParameter("category", category)
            .AddParameter("limit", paging.PageSize).AddParameter("offset", paging.Offset);
        var items = new List<AdminFeedbackDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            items.Add(new AdminFeedbackDto(
                r.GetGuid(0), r.IsDBNull(1) ? null : r.GetGuid(1), r.IsDBNull(2) ? null : r.GetString(2),
                r.IsDBNull(3) ? null : r.GetString(3), r.GetString(4), r.IsDBNull(5) ? null : r.GetInt16(5),
                r.GetString(6), r.IsDBNull(7) ? null : r.GetString(7), r.GetString(8),
                r.IsDBNull(9) ? null : r.GetString(9), r.IsDBNull(10) ? null : r.GetString(10),
                r.IsDBNull(11) ? null : r.GetFieldValue<DateTimeOffset>(11), r.GetFieldValue<DateTimeOffset>(12)));
        }
        return new PagedResult<AdminFeedbackDto>(items, paging.Page, paging.PageSize, totalCount);
    }

    // Only "new" feedback can be marked; reviewing twice returns false (404 at the controller).
    public async Task<bool> MarkReviewedAsync(Guid id, Guid reviewer, string? note, CancellationToken ct)
    {
        await using var c = await factory.OpenConnectionAsync(ct);
        await using var cmd = c.CreateCommand();
        cmd.CommandText = """
            WITH updated AS (
                UPDATE user_feedback SET status = 'reviewed', staff_note = @note, reviewed_by = @reviewer, reviewed_at = now()
                WHERE id = @id AND status = 'new' RETURNING id)
            INSERT INTO staff_audit_logs (actor_id, action, target_id, note)
            SELECT @reviewer, 'feedback.reviewed', id, COALESCE(@note, '') FROM updated
            """;
        cmd.AddParameter("note", string.IsNullOrWhiteSpace(note) ? null : note.Trim())
            .AddParameter("reviewer", reviewer).AddParameter("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) == 1;
    }
}

// Matches the CHECK constraint on user_feedback.category.
public static class FeedbackCategories
{
    public const string Bug = "bug";
    public const string Suggestion = "suggestion";
    public const string Praise = "praise";
    public const string Other = "other";
}

public sealed record CreateFeedbackRequest(
    [Required, AllowedValues(FeedbackCategories.Bug, FeedbackCategories.Suggestion, FeedbackCategories.Praise, FeedbackCategories.Other)]
    [property: Description("Loại góp ý: bug (lỗi), suggestion (đề xuất tính năng), praise (khen ngợi) hoặc other (khác).")]
    string Category,
    [Required(AllowEmptyStrings = false), StringLength(2000, MinimumLength = 5)]
    [property: Description("Nội dung góp ý, 5–2000 ký tự.")]
    string Message,
    [Range(1, 5)]
    [property: Description("Mức hài lòng 1–5 sao; có thể null.")]
    int? Rating,
    [StringLength(300)]
    [property: Description("Đường dẫn trang người dùng đang ở khi gửi, ví dụ /rooms; có thể null.")]
    string? PagePath);

public sealed record FeedbackDto(Guid Id, string Category, short? Rating, string Message, string Status, DateTimeOffset CreatedAt);

public sealed record AdminFeedbackDto(
    Guid Id,
    [property: Description("UUID người gửi; null nếu tài khoản đã bị xóa.")] Guid? UserId,
    string? UserName,
    string? UserEmail,
    string Category,
    short? Rating,
    string Message,
    string? PagePath,
    [property: Description("new (chưa xem) hoặc reviewed (đã xem).")] string Status,
    string? StaffNote,
    string? ReviewerName,
    DateTimeOffset? ReviewedAt,
    DateTimeOffset CreatedAt);

public sealed record ReviewFeedbackRequest(
    [StringLength(2000)]
    [property: Description("Ghi chú nội bộ của kiểm duyệt viên, tối đa 2000 ký tự; có thể null.")]
    string? StaffNote);
