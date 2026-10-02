using System.ComponentModel.DataAnnotations;

namespace RoomieMatch.Modules.Hyperlocal.Services;

// The curated directory phone is optional, and a form that leaves it untouched sends "" or "   "
// rather than null. [Phone] rejects both of those shapes, which would make an otherwise valid
// create/update fail with 400 even though HyperlocalService.Normalize already stores blank as
// NULL. This attribute keeps the phone format rule for real values and treats blank as absent.
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
internal sealed class OptionalPhoneAttribute : ValidationAttribute
{
    private static readonly PhoneAttribute Phone = new();

    public OptionalPhoneAttribute()
        : base("Số điện thoại dịch vụ không hợp lệ.")
    {
    }

    public override bool IsValid(object? value)
    {
        return string.IsNullOrWhiteSpace(value as string) || Phone.IsValid(value);
    }
}
