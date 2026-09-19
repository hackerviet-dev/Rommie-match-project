namespace RoomieMatch.Modules.Users.Services;

internal static class ProfileCompletion
{
    // Display name and city are mandatory everywhere, so they form the 40-point baseline.
    public static short Calculate(
        DateOnly? birthDate,
        string? gender,
        string? occupation,
        string? district,
        string? bio)
    {
        var completion = 40;
        if (birthDate is not null)
        {
            completion += 15;
        }

        if (!string.IsNullOrWhiteSpace(gender))
        {
            completion += 15;
        }

        if (!string.IsNullOrWhiteSpace(occupation))
        {
            completion += 10;
        }

        if (!string.IsNullOrWhiteSpace(district))
        {
            completion += 10;
        }

        if (!string.IsNullOrWhiteSpace(bio))
        {
            completion += 10;
        }

        return (short)completion;
    }
}
