using System.ComponentModel.DataAnnotations;

namespace RoomieMatch.Shared.Paging;

// Bound from the query string (?page=&pageSize=). Every list endpoint takes one so no
// caller can pull an unbounded result set.
public sealed class PageQuery
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 50;

    [Range(1, 100_000)]
    public int Page { get; init; } = 1;

    [Range(1, MaxPageSize)]
    public int PageSize { get; init; } = DefaultPageSize;

    public int Offset => (Page - 1) * PageSize;
}

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount)
{
    public bool HasNextPage => (long)Page * PageSize < TotalCount;
}
