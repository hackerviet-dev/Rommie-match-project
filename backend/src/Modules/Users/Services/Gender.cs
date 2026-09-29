using System.ComponentModel.DataAnnotations;

namespace RoomieMatch.Modules.Users.Services;

// profiles.gender stores a code so it can be compared with a roommate gender
// preference. Vietnamese labels are still accepted from older clients.
internal static class Gender
{
    public static string? ToCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim().ToLowerInvariant() switch
        {
            "male" or "nam" => "male",
            "female" or "nữ" or "nu" => "female",
            "other" or "khác" or "khac" => "other",
            _ => null
        };
    }
}

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
internal sealed class GenderAttribute : ValidationAttribute
{
    public GenderAttribute()
        : base("Giới tính phải là male, female hoặc other.")
    {
    }

    public override bool IsValid(object? value)
    {
        return value is null
            || value is string text && (string.IsNullOrWhiteSpace(text) || Gender.ToCode(text) is not null);
    }
}
