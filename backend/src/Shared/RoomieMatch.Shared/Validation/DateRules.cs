using System.ComponentModel.DataAnnotations;

namespace RoomieMatch.Shared.Validation;

public static class DateRules
{
    public static DateOnly Today => DateOnly.FromDateTime(DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(7)).DateTime);
}

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class NotPastDateAttribute : ValidationAttribute
{
    public override bool IsValid(object? value) => value is null || value is DateOnly date && date >= DateRules.Today;
    public NotPastDateAttribute() => ErrorMessage = "Ngày phải từ hôm nay trở đi.";
}

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class NotFutureDateAttribute : ValidationAttribute
{
    public override bool IsValid(object? value) => value is null || value is DateOnly date && date <= DateRules.Today;
    public NotFutureDateAttribute() => ErrorMessage = "Ngày sinh không được ở tương lai.";
}
