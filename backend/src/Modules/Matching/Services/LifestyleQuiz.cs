namespace RoomieMatch.Modules.Matching.Services;

// The questions live on the server so the answers stored in quiz_responses always refer
// to option ids the scorer understands. Changing what an option means requires a new
// Code, otherwise old answers would silently be reinterpreted.
internal static class LifestyleQuiz
{
    public const string Code = "lifestyle_v1";
    public const string Title = "Trắc nghiệm tính cách & lối sống";

    private static readonly QuizQuestion[] Questions =
    [
        new("weekend_guests", "🎉",
            "Bạn cùng phòng muốn mời bạn bè qua chơi mỗi cuối tuần. Bạn cảm thấy thế nào?",
        [
            new("welcome", "Quá vui — cứ thoải mái!", Noise: 90),
            new("with_notice", "Đôi khi cũng được, nếu báo trước", Noise: 55),
            new("quiet_weekends", "Mình thích cuối tuần yên tĩnh", Noise: 15)
        ]),
        new("late_dishes", "🍽️",
            "11 giờ đêm, chén dĩa bữa tối vẫn còn trong bồn. Bạn sẽ…",
        [
            new("wash_now", "Rửa ngay lập tức", Tidiness: 95),
            new("next_morning", "Để mai sáng rửa", Tidiness: 60),
            new("might_forget", "Nói thật mình có thể quên luôn", Tidiness: 20)
        ]),
        new("saturday_morning", "☀️",
            "Sáng thứ Bảy lý tưởng của bạn là…",
        [
            new("sleep_in", "Ngủ tới trưa", EarlyBird: 10),
            new("brunch", "Brunch với bạn lúc 10h", EarlyBird: 50),
            new("early_run", "Dậy 6h đi chạy bộ", EarlyBird: 90)
        ]),
        new("shared_costs", "💸",
            "Bạn thích chia chi phí chung như thế nào?",
        [
            new("split_evenly", "Chia đều cho gọn"),
            new("itemize", "Tính chi li từng món"),
            new("each_pays", "Ai mua người đó trả")
        ]),
        new("sofa_guest", "🛋️",
            "Bạn thân muốn ngủ nhờ sofa 3 đêm. Bạn xử lý ra sao?",
        [
            new("of_course", "Tất nhiên rồi, cứ tự nhiên", Noise: 85),
            new("ask_roommate", "Ok nhưng phải báo bạn cùng phòng", Noise: 50),
            new("no_guests", "Có khách sạn để làm gì?", Noise: 15)
        ])
    ];

    public static QuizDto Describe()
    {
        return new QuizDto(
            Code,
            Title,
            Questions
                .Select(q => new QuizQuestionDto(
                    q.Id,
                    q.Text,
                    q.Emoji,
                    q.Options.Select(o => new QuizOptionDto(o.Id, o.Text)).ToArray()))
                .ToArray());
    }

    // Returns the problems with the answers, keyed by question id; empty when valid.
    public static Dictionary<string, string[]> Validate(IReadOnlyDictionary<string, string> answers)
    {
        var errors = new Dictionary<string, string[]>();

        foreach (var question in Questions)
        {
            if (!answers.TryGetValue(question.Id, out var optionId) || string.IsNullOrWhiteSpace(optionId))
            {
                errors[question.Id] = ["Bạn chưa trả lời câu này."];
            }
            else if (question.Options.All(o => o.Id != optionId))
            {
                errors[question.Id] = ["Lựa chọn không hợp lệ."];
            }
        }

        foreach (var unknown in answers.Keys.Where(key => Questions.All(q => q.Id != key)))
        {
            errors[unknown] = ["Câu hỏi không tồn tại."];
        }

        return errors;
    }

    // Answers must already have passed Validate.
    public static QuizTraitsDto Evaluate(IReadOnlyDictionary<string, string> answers)
    {
        var picked = Questions
            .Select(q => q.Options.Single(o => o.Id == answers[q.Id]))
            .ToArray();

        return new QuizTraitsDto(
            Average(picked.Select(o => o.Noise)),
            Average(picked.Select(o => o.Tidiness)),
            Average(picked.Select(o => o.EarlyBird)),
            answers["shared_costs"]);
    }

    // Short personality tags, e.g. "Thích yên tĩnh · Gọn gàng · Cú đêm".
    public static string[] Tags(QuizTraitsDto traits)
    {
        var tags = new List<string>
        {
            traits.NoiseTolerance switch
            {
                >= 70 => "Thích náo nhiệt",
                <= 35 => "Thích yên tĩnh",
                _ => "Linh hoạt"
            }
        };

        if (traits.Tidiness >= 80)
        {
            tags.Add("Gọn gàng");
        }

        if (traits.EarlyBird >= 70)
        {
            tags.Add("Dậy sớm");
        }
        else if (traits.EarlyBird <= 30)
        {
            tags.Add("Cú đêm");
        }

        return [.. tags];
    }

    private static int Average(IEnumerable<int?> values)
    {
        var known = values.OfType<int>().ToArray();
        return known.Length == 0 ? 50 : (int)Math.Round(known.Average());
    }

    private sealed record QuizQuestion(string Id, string Emoji, string Text, QuizOption[] Options);

    private sealed record QuizOption(
        string Id,
        string Text,
        int? Noise = null,
        int? Tidiness = null,
        int? EarlyBird = null);
}
