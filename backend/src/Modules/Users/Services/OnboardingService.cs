using System.Text.Json;
using RoomieMatch.Shared.Data;

namespace RoomieMatch.Modules.Users.Services;

public sealed class OnboardingService(IDbConnectionFactory connectionFactory)
{
    public async Task<bool> IsCompleteAsync(Guid userId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT EXISTS (SELECT 1 FROM profiles WHERE user_id = @id AND onboarding_completed_at IS NOT NULL AND onboarding_data IS NOT NULL)";
        command.AddParameter("id", userId);
        return (bool)(await command.ExecuteScalarAsync(cancellationToken))!;
    }

    public async Task SaveAsync(Guid userId, OnboardingRequest request, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            UPDATE profiles SET display_name = @name, birth_year = @year, gender = @gender,
                occupation_status = @employment, organization_name = @org, hide_organization = @hide,
                occupation = @occupation, bio = @bio, city = @city,
                district = CASE WHEN @has_room THEN @district ELSE district END, has_room = @has_room,
                profile_completion = 55 + CASE WHEN @gender IS NOT NULL THEN 15 ELSE 0 END
                    + 10 + CASE WHEN @has_room OR district IS NOT NULL THEN 10 ELSE 0 END
                    + CASE WHEN length(@bio) > 0 THEN 10 ELSE 0 END,
                onboarding_data = CAST(@data AS jsonb), onboarding_completed_at = now(), updated_at = now()
            WHERE user_id = @id;
            INSERT INTO lifestyle_preferences (user_id, sleep_schedule, cleanliness, social_style, smoking,
                pet_friendly, drinking, room_environment, extroversion, budget_min, budget_max, move_in_date,
                preferred_distance, preferred_room_type)
            VALUES (@id, @sleep, @cleanliness, @social, @smoke, @pets, @drink, @env, @extroversion,
                @min, @max, @move, @distance, @room_type)
            ON CONFLICT (user_id) DO UPDATE SET sleep_schedule = EXCLUDED.sleep_schedule,
                cleanliness = EXCLUDED.cleanliness, social_style = EXCLUDED.social_style,
                smoking = EXCLUDED.smoking, pet_friendly = EXCLUDED.pet_friendly, drinking = EXCLUDED.drinking,
                room_environment = EXCLUDED.room_environment, extroversion = EXCLUDED.extroversion,
                budget_min = EXCLUDED.budget_min, budget_max = EXCLUDED.budget_max, move_in_date = EXCLUDED.move_in_date,
                preferred_distance = EXCLUDED.preferred_distance, preferred_room_type = EXCLUDED.preferred_room_type,
                updated_at = now();
            """;
        var employment = request.Employment switch { "Đang đi học" => "student", "Đang đi làm" => "employed", "Cả hai" => "both", _ => "other" };
        command.AddParameter("id", userId).AddParameter("name", request.Name.Trim())
            .AddParameter("year", (short)(DateTime.UtcNow.Year - int.Parse(request.Age)))
            .AddParameter("gender", request.Gender switch { "Nam" => "male", "Nữ" => "female", "Khác" => "other", _ => (string?)null })
            .AddParameter("employment", employment).AddParameter("org", request.OrgName.Trim()).AddParameter("hide", request.HideOrg)
            .AddParameter("occupation", request.Employment).AddParameter("bio", request.Bio.Trim()).AddParameter("city", request.City.Trim())
            .AddParameter("district", request.District).AddParameter("has_room", request.HasRoom == "yes")
            .AddParameter("data", JsonSerializer.Serialize(request, new JsonSerializerOptions(JsonSerializerDefaults.Web)))
            .AddParameter("sleep", request.Sleep switch { "Trước 22h" => "early", "22h–0h" => "normal", _ => "late" })
            .AddParameter("cleanliness", (short)request.Cleanliness).AddParameter("social", request.Extroversion < 50 ? "introvert" : "extrovert")
            .AddParameter("smoke", request.Yn["smoke"] == "Có").AddParameter("pets", request.Yn["pets"] == "Có").AddParameter("drink", request.Yn["drink"] == "Có")
            .AddParameter("env", request.Env switch { "Yên tĩnh" => "quiet", "Vừa phải" => "moderate", _ => "lively" })
            .AddParameter("extroversion", (short)request.Extroversion).AddParameter("min", request.BudgetMin * 1000000).AddParameter("max", request.BudgetMax * 1000000)
            .AddParameter("move", DateOnly.ParseExact(request.HasRoom == "yes" ? request.MoveIn : request.MoveInDate, "yyyy-MM-dd"))
            .AddParameter("distance", request.HasRoom == "yes" ? null : request.Distance switch { "< 2 km" => "lt_2km", "2–5 km" => "2_5km", "5–10 km" => "5_10km", _ => "anywhere" })
            .AddParameter("room_type", request.HasRoom == "yes" ? null : request.RoomType switch { "Phòng riêng" => "private", "Phòng chung" => "shared", "Studio" => "studio", _ => "whole_apartment" });
        await command.ExecuteNonQueryAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }
}
