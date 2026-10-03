using System.Data.Common;
using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Options;
using RoomieMatch.Shared.Contracts;
using RoomieMatch.Shared.Data;
using RoomieMatch.Shared.Paging;

namespace RoomieMatch.Modules.Matching.Services;

public sealed class MatchingService(
    IDbConnectionFactory connectionFactory,
    IPremiumStatus premiumStatus,
    IOptions<MatchingOptions> options) : IMatchingService
{
    // Monthly quotas follow the calendar month in Vietnam (UTC+7, no daylight saving).
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    // Age is hidden when the member asks for it; birth_date wins over the onboarding's
    // birth_year when both are present.
    private const string MatchColumns = """
        p.user_id, p.display_name,
        CASE
            WHEN p.hide_age THEN NULL
            WHEN p.birth_date IS NOT NULL THEN date_part('year', age(current_date, p.birth_date))::int
            ELSE date_part('year', current_date)::int - p.birth_year
        END,
        p.occupation, p.city, p.district, p.avatar_url, p.is_verified,
        ms.overall_score, ms.breakdown::text, ms.explanation,
        lp.budget_min, lp.budget_max, lp.interests, boost.active IS NOT NULL
        """;

    private const string ActiveBoostSql = """
        SELECT id, starts_at, ends_at
        FROM profile_boosts
        WHERE user_id = @user_id AND starts_at <= now() AND ends_at > now()
        ORDER BY ends_at DESC
        LIMIT 1
        """;

    private const string CountRunsSql = """
        SELECT count(*) FROM matching_runs WHERE user_id = @user_id AND created_at >= @since
        """;

    private const string CountBoostsSql = """
        SELECT count(*) FROM profile_boosts WHERE user_id = @user_id AND starts_at >= @since
        """;

    public object GetModuleStatus()
    {
        return new
        {
            module = "Matching",
            features = new[]
            {
                "questionnaire", "compatibility-score", "filters", "match-detail", "scan-quota", "boost"
            }
        };
    }

    public async Task<MatchListResult> GetMatchesAsync(
        Guid userId,
        PageQuery paging,
        MatchFilterQuery filters,
        CancellationToken cancellationToken)
    {
        if (filters.HasAdvancedFilters() && !await premiumStatus.IsPremiumAsync(userId, cancellationToken))
        {
            return new MatchListResult(MatchingError.PremiumRequired, null);
        }

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        return new MatchListResult(
            MatchingError.None,
            await ReadMatchesAsync(connection, userId, paging, filters, cancellationToken));
    }

    public async Task<MatchDetailDto?> GetMatchDetailAsync(
        Guid userId,
        Guid candidateId,
        CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);

        var (fromWhere, parameters) = BuildVisibleMatches(userId, filters: null, candidateId);
        await using var command = connection.CreateCommand();
        command.CommandText = $"SELECT {MatchColumns}, p.bio, ms.calculated_at {fromWhere}";
        Bind(command, parameters);

        RoommateMatchDto match;
        string? bio;
        DateTimeOffset calculatedAt;
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            match = ReadMatch(reader);
            bio = reader.IsDBNull(15) ? null : reader.GetString(15);
            calculatedAt = reader.GetFieldValue<DateTimeOffset>(16);
        }

        var snapshots = await LoadSnapshotsAsync(connection, null, userId, candidateId, cancellationToken);
        var mine = snapshots.SingleOrDefault(s => s.UserId == userId);
        var theirs = snapshots.SingleOrDefault(s => s.UserId == candidateId);

        var sharedInterests = mine is null
            ? []
            : match.Interests.Intersect(mine.Interests, StringComparer.OrdinalIgnoreCase).ToArray();

        var isPremium = await premiumStatus.IsPremiumAsync(userId, cancellationToken);
        var comparison = isPremium && mine is not null && theirs is not null
            ? Compare(mine, theirs)
            : null;

        return new MatchDetailDto(match, bio, sharedInterests, calculatedAt, comparison, !isPremium);
    }

    public async Task<RecalculationResult> RecalculateAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var isPremium = await premiumStatus.IsPremiumAsync(userId, cancellationToken);
        var period = CurrentPeriod();

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);

        int candidatesScored;
        await using (var transaction = await connection.BeginTransactionAsync(cancellationToken))
        {
            // Serialises this user's scans so two concurrent requests cannot both see the
            // last free scan as unused.
            await LockUserAsync(connection, transaction, userId, cancellationToken);

            if (!isPremium
                && await CountAsync(connection, transaction, CountRunsSql, userId, period.Start, cancellationToken)
                    >= options.Value.FreeScansPerMonth)
            {
                return new RecalculationResult(MatchingError.ScanQuotaExceeded, null, period.End);
            }

            var snapshots = await LoadSnapshotsAsync(connection, transaction, userId, null, cancellationToken);
            var me = snapshots.SingleOrDefault(snapshot => snapshot.UserId == userId);
            if (me is null)
            {
                return new RecalculationResult(MatchingError.NoPreferences, null, null);
            }

            var candidates = snapshots.Where(snapshot => snapshot.UserId != userId).ToArray();
            candidatesScored = candidates.Length;

            // A scan that found nobody to score does not use up a free scan.
            if (candidates.Length > 0)
            {
                await UpsertScoresAsync(connection, transaction, me, candidates, cancellationToken);

                await using var run = CreateCommand(
                    connection,
                    transaction,
                    "INSERT INTO matching_runs (user_id, candidates_scored) VALUES (@user_id, @candidates_scored)");
                run.AddParameter("user_id", userId).AddParameter("candidates_scored", candidates.Length);
                await run.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
        }

        return new RecalculationResult(
            MatchingError.None,
            new MatchRecalculationResult(
                candidatesScored,
                await ReadMatchesAsync(connection, userId, new PageQuery(), new MatchFilterQuery(), cancellationToken)),
            null);
    }

    public async Task<MatchingUsageDto> GetUsageAsync(Guid userId, CancellationToken cancellationToken)
    {
        var isPremium = await premiumStatus.IsPremiumAsync(userId, cancellationToken);
        var period = CurrentPeriod();

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var scansUsed = await CountAsync(connection, null, CountRunsSql, userId, period.Start, cancellationToken);
        var boostsUsed = await CountAsync(connection, null, CountBoostsSql, userId, period.Start, cancellationToken);
        var activeBoost = await ReadActiveBoostAsync(connection, null, userId, cancellationToken);

        int? scansLimit = isPremium ? null : options.Value.FreeScansPerMonth;
        return new MatchingUsageDto(
            isPremium,
            scansUsed,
            scansLimit,
            scansLimit is { } limit ? Math.Max(0, limit - scansUsed) : null,
            boostsUsed,
            isPremium ? options.Value.BoostsPerMonth : 0,
            activeBoost,
            period.Start,
            period.End);
    }

    public async Task<BoostResult> ActivateBoostAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (!await premiumStatus.IsPremiumAsync(userId, cancellationToken))
        {
            return new BoostResult(MatchingError.PremiumRequired, null, null);
        }

        var period = CurrentPeriod();

        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await LockUserAsync(connection, transaction, userId, cancellationToken);

        // Nobody would see a boost on a hidden profile, so do not let it burn a boost.
        await using (var visible = CreateCommand(
            connection,
            transaction,
            "SELECT is_public FROM profiles WHERE user_id = @user_id"))
        {
            visible.AddParameter("user_id", userId);
            if (await visible.ExecuteScalarAsync(cancellationToken) is not true)
            {
                return new BoostResult(MatchingError.ProfileHidden, null, null);
            }
        }

        if (await ReadActiveBoostAsync(connection, transaction, userId, cancellationToken) is { } active)
        {
            return new BoostResult(MatchingError.BoostAlreadyActive, active, null);
        }

        if (await CountAsync(connection, transaction, CountBoostsSql, userId, period.Start, cancellationToken)
            >= options.Value.BoostsPerMonth)
        {
            return new BoostResult(MatchingError.BoostQuotaExceeded, null, period.End);
        }

        await using var insert = CreateCommand(
            connection,
            transaction,
            """
            INSERT INTO profile_boosts (user_id, starts_at, ends_at)
            VALUES (@user_id, now(), now() + make_interval(mins => @minutes))
            RETURNING id, starts_at, ends_at
            """);
        insert.AddParameter("user_id", userId).AddParameter("minutes", options.Value.BoostDurationMinutes);

        BoostDto boost;
        await using (var reader = await insert.ExecuteReaderAsync(cancellationToken))
        {
            await reader.ReadAsync(cancellationToken);
            boost = ReadBoost(reader);
        }

        await transaction.CommitAsync(cancellationToken);
        return new BoostResult(MatchingError.None, boost, null);
    }

    private static async Task UpsertScoresAsync(
        DbConnection connection,
        DbTransaction transaction,
        LifestyleSnapshot me,
        LifestyleSnapshot[] candidates,
        CancellationToken cancellationToken)
    {
        // Scores are symmetric, so store both directions and keep the candidate's list fresh
        // too. Rows go in key order so two members scanning at once lock shared pairs in the
        // same order instead of deadlocking.
        var rows = candidates
            .Select(candidate => (Candidate: candidate, Score: CompatibilityScorer.Score(me, candidate)))
            .SelectMany(pair => new[]
            {
                (UserId: me.UserId, CandidateId: pair.Candidate.UserId, pair.Score),
                (UserId: pair.Candidate.UserId, CandidateId: me.UserId, pair.Score)
            })
            .OrderBy(row => row.UserId)
            .ThenBy(row => row.CandidateId)
            .ToArray();

        var values = string.Join(
            ",\n    ",
            rows.Select((_, index) =>
                $"(@user_{index}, @candidate_{index}, @score_{index}, @breakdown_{index}::jsonb, @explanation_{index}, now())"));

        var sql = $"""
            INSERT INTO matching_scores
                (user_id, candidate_user_id, overall_score, breakdown, explanation, calculated_at)
            VALUES
                {values}
            ON CONFLICT (user_id, candidate_user_id) DO UPDATE SET
                overall_score = EXCLUDED.overall_score,
                breakdown = EXCLUDED.breakdown,
                explanation = EXCLUDED.explanation,
                calculated_at = now()
            """;

        await using var command = CreateCommand(connection, transaction, sql);
        for (var index = 0; index < rows.Length; index++)
        {
            var (rowUserId, candidateId, score) = rows[index];
            command
                .AddParameter($"user_{index}", rowUserId)
                .AddParameter($"candidate_{index}", candidateId)
                .AddParameter($"score_{index}", score.Overall)
                .AddParameter($"breakdown_{index}", JsonSerializer.Serialize(score.Breakdown))
                .AddParameter($"explanation_{index}", score.Explanation);
        }

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<LifestyleSnapshot[]> LoadSnapshotsAsync(
        DbConnection connection,
        DbTransaction? transaction,
        Guid userId,
        Guid? onlyCandidateId,
        CancellationToken cancellationToken)
    {
        // The caller is always included so the service can tell "no preferences saved"
        // apart from "no candidates at all". A room environment picked in the lifestyle
        // form beats the quiz's estimate of how much noise the member tolerates.
        var sql = $"""
            SELECT lp.user_id, p.city, p.district, lp.sleep_schedule, lp.cleanliness,
                   lp.social_style, lp.smoking, lp.pet_friendly, lp.budget_min, lp.budget_max,
                   lp.move_in_date, lp.interests,
                   CASE lp.room_environment
                       WHEN 'quiet' THEN 15
                       WHEN 'moderate' THEN 50
                       WHEN 'lively' THEN 85
                       ELSE (qr.result->'traits'->>'noiseTolerance')::int
                   END
            FROM lifestyle_preferences lp
            INNER JOIN users u ON u.id = lp.user_id
            INNER JOIN profiles p ON p.user_id = lp.user_id
            LEFT JOIN quiz_responses qr ON qr.user_id = lp.user_id AND qr.quiz_code = @quiz_code
            WHERE u.is_active = true
              -- A lifestyle_preferences row may carry only the onboarding housing-need fields
              -- (drinking, preferred_distance, preferred_room_type) with sleep_schedule NULL.
              -- Those rows are not a submitted lifestyle questionnaire, so they stay out of
              -- matching exactly as if the row did not exist.
              AND lp.sleep_schedule IS NOT NULL
              AND {(onlyCandidateId is null
                  ? "(lp.user_id = @user_id OR u.role = 'member')"
                  : "lp.user_id IN (@user_id, @candidate_id)")}
            """;

        await using var command = CreateCommand(connection, transaction, sql);
        command
            .AddParameter("user_id", userId)
            .AddParameter("quiz_code", LifestyleQuiz.Code);
        if (onlyCandidateId is { } candidateId)
        {
            command.AddParameter("candidate_id", candidateId);
        }

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var snapshots = new List<LifestyleSnapshot>();
        while (await reader.ReadAsync(cancellationToken))
        {
            snapshots.Add(new LifestyleSnapshot(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.GetString(3),
                reader.GetInt16(4),
                reader.GetString(5),
                reader.GetBoolean(6),
                reader.GetBoolean(7),
                reader.GetInt32(8),
                reader.GetInt32(9),
                reader.IsDBNull(10) ? null : reader.GetFieldValue<DateOnly>(10),
                reader.GetFieldValue<string[]>(11),
                reader.IsDBNull(12) ? null : reader.GetInt32(12)));
        }

        return [.. snapshots];
    }

    private async Task<PagedResult<RoommateMatchDto>> ReadMatchesAsync(
        DbConnection connection,
        Guid userId,
        PageQuery paging,
        MatchFilterQuery filters,
        CancellationToken cancellationToken)
    {
        var (fromWhere, parameters) = BuildVisibleMatches(userId, filters, candidateId: null);

        await using var countCommand = connection.CreateCommand();
        countCommand.CommandText = $"SELECT count(*) {fromWhere}";
        Bind(countCommand, parameters);
        var totalCount = (int)(long)(await countCommand.ExecuteScalarAsync(cancellationToken))!;

        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT {MatchColumns}
            {fromWhere}
            ORDER BY ms.overall_score + CASE WHEN boost.active IS NOT NULL THEN @boost_bonus ELSE 0 END DESC,
                     ms.overall_score DESC,
                     ms.candidate_user_id
            LIMIT @limit OFFSET @offset
            """;
        Bind(command, parameters);
        command
            .AddParameter("boost_bonus", options.Value.BoostRankBonus)
            .AddParameter("limit", paging.PageSize)
            .AddParameter("offset", paging.Offset);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var matches = new List<RoommateMatchDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            matches.Add(ReadMatch(reader));
        }

        return new PagedResult<RoommateMatchDto>(matches, paging.Page, paging.PageSize, totalCount);
    }

    // FROM/WHERE shared by the list, its count and the pair detail. Visibility is checked
    // at read time, not when scores are written, so turning "Hồ sơ công khai" off,
    // disabling the account or blocking hides the candidate at once from every list that
    // already contains them.
    private static (string FromWhere, List<(string Name, object? Value)> Parameters) BuildVisibleMatches(
        Guid userId,
        MatchFilterQuery? filters,
        Guid? candidateId)
    {
        var parameters = new List<(string Name, object? Value)> { ("user_id", userId) };
        var conditions = new List<string>();

        if (candidateId is not null)
        {
            conditions.Add("ms.candidate_user_id = @candidate_id");
            parameters.Add(("candidate_id", candidateId));
        }

        if (filters is not null)
        {
            if (!string.IsNullOrWhiteSpace(filters.City))
            {
                conditions.Add("(lower(btrim(p.city)) = lower(@selected_city) OR (lower(@selected_city) = 'tp.hcm' AND lower(btrim(p.city)) = 'tp. hồ chí minh'))");
                parameters.Add(("selected_city", filters.City.Trim()));
            }
            if (!string.IsNullOrWhiteSpace(filters.Q))
            {
                conditions.Add("""
                    (p.display_name ILIKE @q ESCAPE '\'
                     OR EXISTS (SELECT 1 FROM unnest(lp.interests) AS interest WHERE interest ILIKE @q ESCAPE '\'))
                    """);
                parameters.Add(("q", $"%{EscapeLike(filters.Q.Trim())}%"));
            }

            if (filters.MinScore is { } minScore)
            {
                conditions.Add("ms.overall_score >= @min_score");
                parameters.Add(("min_score", minScore));
            }

            if (filters.SameCity)
            {
                conditions.Add(
                    "lower(btrim(p.city)) = (SELECT lower(btrim(mine.city)) FROM profiles mine WHERE mine.user_id = @user_id)");
            }

            if (filters.PetFriendly)
            {
                conditions.Add("lp.pet_friendly");
            }

            if (filters.NonSmoking)
            {
                conditions.Add("NOT lp.smoking");
            }

            if (filters.MoveInBy is { } moveInBy)
            {
                conditions.Add("lp.move_in_date <= @move_in_by");
                parameters.Add(("move_in_by", moveInBy));
            }

            if (filters.BudgetMin is { } budgetMin)
            {
                conditions.Add("lp.budget_max >= @budget_min");
                parameters.Add(("budget_min", budgetMin));
            }

            if (filters.BudgetMax is { } budgetMax)
            {
                conditions.Add("lp.budget_min <= @budget_max");
                parameters.Add(("budget_max", budgetMax));
            }

            if (!string.IsNullOrWhiteSpace(filters.District))
            {
                conditions.Add("lower(btrim(p.district)) = lower(@district)");
                parameters.Add(("district", filters.District.Trim()));
            }

            if (filters.RoomEnvironment is not null)
            {
                conditions.Add("lp.room_environment = @room_environment");
                parameters.Add(("room_environment", filters.RoomEnvironment));
            }

            if (filters.MinCleanliness is { } minCleanliness)
            {
                conditions.Add("lp.cleanliness >= @min_cleanliness");
                parameters.Add(("min_cleanliness", minCleanliness));
            }

            if (filters.VerifiedOnly)
            {
                conditions.Add("p.is_verified");
            }
        }

        var fromWhere = $"""
            FROM matching_scores ms
            INNER JOIN users u ON u.id = ms.candidate_user_id
            INNER JOIN profiles p ON p.user_id = ms.candidate_user_id
            INNER JOIN lifestyle_preferences lp ON lp.user_id = ms.candidate_user_id
            LEFT JOIN LATERAL (
                SELECT true AS active
                FROM profile_boosts pb
                WHERE pb.user_id = ms.candidate_user_id AND pb.starts_at <= now() AND pb.ends_at > now()
                LIMIT 1
            ) boost ON true
            WHERE ms.user_id = @user_id
              AND u.is_active = true
              AND u.role = 'member'
              AND p.is_public = true
              AND NOT EXISTS (
                  SELECT 1 FROM user_blocks b
                  WHERE b.deleted_at IS NULL
                    AND ((b.blocker_id = @user_id AND b.blocked_id = ms.candidate_user_id)
                      OR (b.blocker_id = ms.candidate_user_id AND b.blocked_id = @user_id)))
            {string.Concat(conditions.Select(condition => $"  AND {condition}\n"))}
            """;

        return (fromWhere, parameters);
    }

    private static RoommateMatchDto ReadMatch(DbDataReader reader)
    {
        var breakdown = JsonSerializer.Deserialize<Dictionary<string, int>>(reader.GetString(9)) ?? [];

        return new RoommateMatchDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetInt32(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.GetString(4),
            reader.IsDBNull(5) ? null : reader.GetString(5),
            reader.IsDBNull(6) ? null : reader.GetString(6),
            reader.GetBoolean(7),
            reader.GetInt16(8),
            CompatibilityScorer.Describe(breakdown)
                .Select(c => new ScoreComponentDto(c.Dimension.Key, c.Dimension.Label, c.Value, c.Dimension.Weight))
                .ToArray(),
            reader.IsDBNull(10) ? null : reader.GetString(10),
            reader.GetInt32(11),
            reader.GetInt32(12),
            reader.GetFieldValue<string[]>(13),
            reader.GetBoolean(14));
    }

    private static ComparisonRowDto[] Compare(LifestyleSnapshot mine, LifestyleSnapshot theirs)
    {
        return CompatibilityScorer.Dimensions
            .Select(d => new ComparisonRowDto(d.Key, d.Label, Describe(d.Key, mine), Describe(d.Key, theirs)))
            .ToArray();
    }

    private static string Describe(string key, LifestyleSnapshot snapshot)
    {
        return key switch
        {
            "sleep" => snapshot.SleepSchedule,
            "cleanliness" => $"{snapshot.Cleanliness}/5",
            "social" => snapshot.SocialStyle,
            "budget" => $"{Millions(snapshot.BudgetMin)}–{Millions(snapshot.BudgetMax)} triệu",
            "noise" => snapshot.NoiseLevel switch
            {
                null => "Chưa trả lời",
                <= 35 => "Thích yên tĩnh",
                >= 70 => "Thích sôi động",
                _ => "Vừa phải"
            },
            "location" => string.IsNullOrWhiteSpace(snapshot.District)
                ? snapshot.City
                : $"{snapshot.District}, {snapshot.City}",
            "lifestyle" => (snapshot.Smoking ? "Hút thuốc" : "Không hút thuốc")
                + " · "
                + (snapshot.PetFriendly ? "Thân thiện thú cưng" : "Không nuôi thú cưng"),
            "interests" => snapshot.Interests.Length == 0 ? "Chưa chọn" : string.Join(", ", snapshot.Interests),
            "timing" => snapshot.MoveInDate?.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture) ?? "Linh hoạt",
            _ => string.Empty
        };
    }

    // 4_500_000 -> "4,5". Formatted by hand because the container runs in invariant
    // globalization mode, where the vi-VN culture is not available.
    private static string Millions(int amount)
    {
        return (amount / 1_000_000m).ToString("0.#", CultureInfo.InvariantCulture).Replace('.', ',');
    }

    private static async Task<BoostDto?> ReadActiveBoostAsync(
        DbConnection connection,
        DbTransaction? transaction,
        Guid userId,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(connection, transaction, ActiveBoostSql);
        command.AddParameter("user_id", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadBoost(reader) : null;
    }

    private static BoostDto ReadBoost(DbDataReader reader)
    {
        return new BoostDto(
            reader.GetGuid(0),
            reader.GetFieldValue<DateTimeOffset>(1),
            reader.GetFieldValue<DateTimeOffset>(2));
    }

    private static async Task<int> CountAsync(
        DbConnection connection,
        DbTransaction? transaction,
        string sql,
        Guid userId,
        DateTimeOffset since,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(connection, transaction, sql);
        command
            .AddParameter("user_id", userId)
            // Npgsql only writes UTC values to timestamptz.
            .AddParameter("since", since.ToUniversalTime());
        return (int)(long)(await command.ExecuteScalarAsync(cancellationToken))!;
    }

    // Transaction-scoped advisory lock rather than a row lock on users, so quota checks do
    // not queue behind token refreshes that share-lock the same row.
    private static async Task LockUserAsync(
        DbConnection connection,
        DbTransaction transaction,
        Guid userId,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(
            connection,
            transaction,
            "SELECT pg_advisory_xact_lock(hashtextextended(@key, 0))");
        command.AddParameter("key", $"matching:{userId}");
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static (DateTimeOffset Start, DateTimeOffset End) CurrentPeriod()
    {
        var now = DateTimeOffset.UtcNow.ToOffset(VietnamOffset);
        var start = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, VietnamOffset);
        return (start, start.AddMonths(1));
    }

    private static string EscapeLike(string value)
    {
        return value.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_");
    }

    private static void Bind(DbCommand command, IEnumerable<(string Name, object? Value)> parameters)
    {
        foreach (var (name, value) in parameters)
        {
            command.AddParameter(name, value);
        }
    }

    private static DbCommand CreateCommand(DbConnection connection, DbTransaction? transaction, string sql)
    {
        var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        return command;
    }
}
