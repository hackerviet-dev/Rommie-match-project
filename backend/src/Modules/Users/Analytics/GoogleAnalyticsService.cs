using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace RoomieMatch.Modules.Users.Analytics;

public sealed record AnalyticsTotalsDto(
    long ActiveUsers,
    long NewUsers,
    long Sessions,
    long PageViews,
    double AverageSessionSeconds,
    double EngagementRate);

public sealed record AnalyticsDailyDto(DateOnly Date, long ActiveUsers, long NewUsers, long PageViews);

public sealed record AnalyticsPageDto(string Path, long Views, long Users);

public sealed record AnalyticsSliceDto(string Label, long Value);

public sealed record AnalyticsReportDto(
    int Days,
    DateTimeOffset GeneratedAt,
    // Users in the last 30 minutes; null when the realtime call alone failed.
    int? RealtimeActiveUsers,
    AnalyticsTotalsDto Current,
    AnalyticsTotalsDto Previous,
    IReadOnlyList<AnalyticsDailyDto> Daily,
    IReadOnlyList<AnalyticsPageDto> TopPages,
    IReadOnlyList<AnalyticsSliceDto> Channels,
    IReadOnlyList<AnalyticsSliceDto> Devices,
    IReadOnlyList<AnalyticsSliceDto> Cities);

public enum AnalyticsError
{
    NotConfigured,
    PermissionDenied,
    Upstream
}

public sealed record AnalyticsResult(AnalyticsReportDto? Report, AnalyticsError? Error);

// Reads the GA4 Data API with a service account, so moderators see the numbers without each
// needing their own Google Analytics access. Plain REST with a self-signed JWT keeps Google's
// SDK and its gRPC stack out of the API.
public sealed class GoogleAnalyticsService(
    IHttpClientFactory httpClientFactory,
    GoogleAnalyticsOptions options,
    IMemoryCache cache,
    ILogger<GoogleAnalyticsService> logger)
{
    public const string HttpClientName = "google-analytics";
    public static readonly int[] AllowedDays = [7, 28, 90];

    private const string Scope = "https://www.googleapis.com/auth/analytics.readonly";
    // GA quota is per property and per hour; staff refreshing the page should not spend it.
    private static readonly TimeSpan ReportLifetime = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan RealtimeLifetime = TimeSpan.FromMinutes(1);
    // Vietnam has no daylight saving, so a fixed offset matches the property's reporting day.
    private static readonly TimeSpan ReportingOffset = TimeSpan.FromHours(7);

    private readonly SemaphoreSlim tokenLock = new(1, 1);
    private string? accessToken;
    private DateTimeOffset accessTokenExpiresAt;

    public string ServiceAccountEmail => options.ClientEmail;

    public async Task<AnalyticsResult> GetReportAsync(int days, CancellationToken cancellationToken)
    {
        if (!options.IsConfigured)
        {
            return new AnalyticsResult(null, AnalyticsError.NotConfigured);
        }

        try
        {
            var report = await cache.GetOrCreateAsync($"ga:report:{days}", entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = ReportLifetime;
                return LoadReportAsync(days, cancellationToken);
            });
            var realtime = await cache.GetOrCreateAsync("ga:realtime", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = RealtimeLifetime;
                try
                {
                    return (int?)await LoadRealtimeAsync(cancellationToken);
                }
                catch (GoogleAnalyticsException exception)
                {
                    // The report is still worth showing; retry realtime on the next minute.
                    logger.LogWarning(exception, "GA4 realtime report failed");
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(5);
                    return null;
                }
            });
            return new AnalyticsResult(report! with { RealtimeActiveUsers = realtime }, null);
        }
        catch (GoogleAnalyticsException exception)
        {
            cache.Remove($"ga:report:{days}");
            logger.LogWarning(exception, "GA4 report failed");
            return new AnalyticsResult(null, exception.PermissionDenied ? AnalyticsError.PermissionDenied : AnalyticsError.Upstream);
        }
    }

    private async Task<AnalyticsReportDto> LoadReportAsync(int days, CancellationToken cancellationToken)
    {
        var current = new DateRange($"{days - 1}daysAgo", "today", "current");
        var previous = new DateRange($"{days * 2 - 1}daysAgo", $"{days}daysAgo", "previous");

        // batchRunReports takes at most five requests, so the six reports go in two batches.
        var first = BatchAsync(
        [
            new ReportRequest([current, previous], [],
                ["activeUsers", "newUsers", "sessions", "screenPageViews", "averageSessionDuration", "engagementRate"]),
            new ReportRequest([current], [new("date")], ["activeUsers", "newUsers", "screenPageViews"],
                [new OrderBy(Dimension: new DimensionOrder("date"))]),
            new ReportRequest([current], [new("pagePath")], ["screenPageViews", "activeUsers"],
                [new OrderBy(Metric: new MetricOrder("screenPageViews"), Desc: true)], Limit: 8)
        ], cancellationToken);
        var second = BatchAsync(
        [
            new ReportRequest([current], [new("sessionDefaultChannelGroup")], ["sessions"],
                [new OrderBy(Metric: new MetricOrder("sessions"), Desc: true)], Limit: 8),
            new ReportRequest([current], [new("deviceCategory")], ["activeUsers"],
                [new OrderBy(Metric: new MetricOrder("activeUsers"), Desc: true)]),
            new ReportRequest([current], [new("city")], ["activeUsers"],
                [new OrderBy(Metric: new MetricOrder("activeUsers"), Desc: true)], Limit: 8)
        ], cancellationToken);
        var reports = (await first).Concat(await second).ToArray();

        // With two date ranges GA adds the range name as the only dimension; empty ranges have no row.
        var totals = reports[0].Rows ?? [];
        AnalyticsTotalsDto Totals(string range) =>
            totals.FirstOrDefault(row => Dimension(row, 0) == range) is { } row
                ? new AnalyticsTotalsDto(Long(row, 0), Long(row, 1), Long(row, 2), Long(row, 3),
                    Math.Round(Double(row, 4), 1, MidpointRounding.AwayFromZero), Math.Round(Double(row, 5), 4, MidpointRounding.AwayFromZero))
                : new AnalyticsTotalsDto(0, 0, 0, 0, 0, 0);

        var daily = (reports[1].Rows ?? [])
            .Where(row => DateOnly.TryParseExact(Dimension(row, 0), "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            .ToDictionary(
                row => DateOnly.ParseExact(Dimension(row, 0), "yyyyMMdd", CultureInfo.InvariantCulture),
                row => new AnalyticsDailyDto(
                    DateOnly.ParseExact(Dimension(row, 0), "yyyyMMdd", CultureInfo.InvariantCulture),
                    Long(row, 0), Long(row, 1), Long(row, 2)));
        // GA leaves days without traffic out; the chart needs them as zeros.
        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.ToOffset(ReportingOffset).DateTime);
        for (var date = today.AddDays(1 - days); date <= today; date = date.AddDays(1))
        {
            daily.TryAdd(date, new AnalyticsDailyDto(date, 0, 0, 0));
        }

        return new AnalyticsReportDto(
            days,
            DateTimeOffset.UtcNow,
            null,
            Totals("current"),
            Totals("previous"),
            daily.Values.OrderBy(day => day.Date).ToArray(),
            (reports[2].Rows ?? []).Select(row => new AnalyticsPageDto(Dimension(row, 0), Long(row, 0), Long(row, 1))).ToArray(),
            Slices(reports[3]),
            Slices(reports[4]),
            Slices(reports[5]));
    }

    private async Task<int> LoadRealtimeAsync(CancellationToken cancellationToken)
    {
        var response = await PostAsync<Report>(
            "runRealtimeReport",
            new { metrics = new[] { new Named("activeUsers") } },
            cancellationToken);
        return (int)(response.Rows is [var row, ..] ? Long(row, 0) : 0);
    }

    private async Task<Report[]> BatchAsync(ReportRequest[] requests, CancellationToken cancellationToken)
    {
        var body = new
        {
            requests = requests.Select(request => new
            {
                dateRanges = request.DateRanges,
                dimensions = request.Dimensions,
                metrics = request.Metrics.Select(name => new Named(name)),
                orderBys = request.OrderBys,
                limit = request.Limit
            })
        };
        var response = await PostAsync<BatchResponse>("batchRunReports", body, cancellationToken);
        if (response.Reports is not { } reports || reports.Length != requests.Length)
        {
            throw new GoogleAnalyticsException("GA4 returned an unexpected number of reports.");
        }

        return reports;
    }

    private async Task<T> PostAsync<T>(string method, object body, CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient(HttpClientName);
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{options.DataApiBaseUrl.TrimEnd('/')}/v1beta/properties/{Uri.EscapeDataString(options.PropertyId)}:{method}")
        {
            Content = JsonContent.Create(body, options: JsonOptions)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await GetAccessTokenAsync(cancellationToken));
        try
        {
            using var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var text = await response.Content.ReadAsStringAsync(cancellationToken);
                if (response.StatusCode == HttpStatusCode.Unauthorized)
                {
                    accessToken = null;
                }

                throw new GoogleAnalyticsException(
                    $"GA4 {method} answered {(int)response.StatusCode}: {text}",
                    response.StatusCode == HttpStatusCode.Forbidden);
            }

            return await response.Content.ReadFromJsonAsync<T>(JsonOptions, cancellationToken)
                ?? throw new GoogleAnalyticsException($"GA4 {method} returned an empty body.");
        }
        catch (Exception exception) when (exception is HttpRequestException or JsonException
            || (exception is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            throw new GoogleAnalyticsException($"GA4 {method} did not respond.", inner: exception);
        }
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        await tokenLock.WaitAsync(cancellationToken);
        try
        {
            if (accessToken is not null && accessTokenExpiresAt > DateTimeOffset.UtcNow.AddMinutes(1))
            {
                return accessToken;
            }

            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var assertion = SignJwt(new Dictionary<string, object>
            {
                ["iss"] = options.ClientEmail,
                ["scope"] = Scope,
                ["aud"] = options.TokenUri,
                ["iat"] = now,
                ["exp"] = now + 3600
            });
            var client = httpClientFactory.CreateClient(HttpClientName);
            using var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
                ["assertion"] = assertion
            });
            try
            {
                using var response = await client.PostAsync(options.TokenUri, content, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    // Google names the problem (deleted key, wrong account) without echoing the key.
                    throw new GoogleAnalyticsException(
                        $"Google token endpoint answered {(int)response.StatusCode}: "
                        + await response.Content.ReadAsStringAsync(cancellationToken));
                }

                var token = await response.Content.ReadFromJsonAsync<TokenResponse>(JsonOptions, cancellationToken);
                if (token?.AccessToken is not { Length: > 0 } value)
                {
                    throw new GoogleAnalyticsException("Google token endpoint returned no access token.");
                }

                accessToken = value;
                accessTokenExpiresAt = DateTimeOffset.UtcNow.AddSeconds(token.ExpiresIn > 0 ? token.ExpiresIn : 3600);
                return value;
            }
            catch (Exception exception) when (exception is HttpRequestException or JsonException
                || (exception is TaskCanceledException && !cancellationToken.IsCancellationRequested))
            {
                throw new GoogleAnalyticsException("Google token endpoint did not respond.", inner: exception);
            }
        }
        finally
        {
            tokenLock.Release();
        }
    }

    private string SignJwt(Dictionary<string, object> claims)
    {
        static string Encode(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        var header = Encode(JsonSerializer.SerializeToUtf8Bytes(new { alg = "RS256", typ = "JWT" }));
        var payload = Encode(JsonSerializer.SerializeToUtf8Bytes(claims));
        using var rsa = RSA.Create();
        try
        {
            rsa.ImportFromPem(options.PrivateKey);
        }
        catch (ArgumentException exception)
        {
            throw new GoogleAnalyticsException("The service account private_key is not a valid PEM key.", inner: exception);
        }

        var signature = rsa.SignData(Encoding.ASCII.GetBytes($"{header}.{payload}"), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        return $"{header}.{payload}.{Encode(signature)}";
    }

    private static IReadOnlyList<AnalyticsSliceDto> Slices(Report report) =>
        (report.Rows ?? []).Select(row => new AnalyticsSliceDto(Dimension(row, 0), Long(row, 0))).ToArray();

    private static string Dimension(Row row, int index) =>
        row.DimensionValues is { } values && index < values.Length ? values[index].Value ?? "" : "";

    private static double Double(Row row, int index) =>
        row.MetricValues is { } values && index < values.Length
        && double.TryParse(values[index].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var value)
            ? value
            : 0;

    private static long Long(Row row, int index) => (long)Math.Round(Double(row, index));

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private sealed record Named(string Name);

    private sealed record DateRange(string StartDate, string EndDate, string Name);

    private sealed record DimensionOrder(string DimensionName);

    private sealed record MetricOrder(string MetricName);

    private sealed record OrderBy(DimensionOrder? Dimension = null, MetricOrder? Metric = null, bool Desc = false);

    private sealed record ReportRequest(
        DateRange[] DateRanges,
        Named[] Dimensions,
        string[] Metrics,
        OrderBy[]? OrderBys = null,
        int? Limit = null);

    private sealed record Cell(string? Value);

    private sealed record Row(Cell[]? DimensionValues, Cell[]? MetricValues);

    private sealed record Report(Row[]? Rows);

    private sealed record BatchResponse(Report[]? Reports);

    private sealed record TokenResponse(
        [property: JsonPropertyName("access_token")] string? AccessToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn);
}

public sealed class GoogleAnalyticsException(string message, bool permissionDenied = false, Exception? inner = null)
    : Exception(message, inner)
{
    public bool PermissionDenied { get; } = permissionDenied;
}
