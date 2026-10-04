import { router } from "expo-router";
import { ArrowLeft, Check, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { FormScreen } from "@/components/form-screen";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-field";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";
import { useMyQuiz, useQuiz, useSaveQuiz } from "../hooks/use-quiz";
import type { Quiz } from "../types/quiz-types";
import { QuizResultDetails } from "./quiz-result-details";

const goHome = () => (router.canGoBack() ? router.back() : router.replace("/"));

export function QuizScreen() {
  const quiz = useQuiz();
  const saved = useMyQuiz();
  const [isRetaking, setIsRetaking] = useState(false);
  const [attempt, setAttempt] = useState(0);

  let content: React.ReactNode;
  if (quiz.isPending || saved.isPending)
    content = <Text className="mt-10 text-center text-slate-500">Đang tải khảo sát…</Text>;
  else if (quiz.isError || saved.isError)
    content = (
      <View className="mt-10 gap-4">
        <FormError message="Không tải được khảo sát. Vui lòng thử lại." />
        <Button
          action="primary"
          onPress={() => {
            void quiz.refetch();
            void saved.refetch();
          }}
        >
          <ButtonText>Thử lại</ButtonText>
        </Button>
      </View>
    );
  else if (!quiz.data?.questions.length) content = <FormError message="Chưa có bộ câu hỏi." />;
  else if (saved.data && !isRetaking)
    content = (
      <Card className="mt-6 gap-5 p-5">
        <Sparkles color={colors.teal} size={32} />
        <Text className="text-2xl font-bold text-ink">Kết quả khảo sát đã lưu</Text>
        <QuizResultDetails result={saved.data} />
        <View className="gap-3">
          <Button action="primary" className="h-12" onPress={() => router.replace("/matches")}>
            <ButtonText>Khám phá ở ghép</ButtonText>
          </Button>
          <Button
            action="primary"
            variant="outline"
            className="h-12"
            onPress={() => {
              setIsRetaking(true);
              setAttempt((value) => value + 1);
            }}
          >
            <ButtonText>Làm lại khảo sát</ButtonText>
          </Button>
        </View>
      </Card>
    );
  else
    content = (
      <QuizQuestionnaire
        key={`${quiz.data.code}-${attempt}`}
        quiz={quiz.data}
        initialAnswers={saved.data?.answers ?? {}}
        onSaved={() => setIsRetaking(false)}
      />
    );

  return (
    <FormScreen>
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về trang chính"
          onPress={goHome}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <ArrowLeft color={colors.navy} size={20} />
        </Pressable>
        <Text className="text-base font-bold text-navy">Khảo sát lối sống</Text>
        <View className="w-10" />
      </View>
      {content}
    </FormScreen>
  );
}

function QuizQuestionnaire({
  quiz,
  initialAnswers,
  onSaved,
}: {
  quiz: Quiz;
  initialAnswers: Record<string, string>;
  onSaved: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      quiz.questions
        .filter((question) =>
          question.options.some((option) => option.id === initialAnswers[question.id]),
        )
        .map((question) => [question.id, initialAnswers[question.id]]),
    ),
  );
  const save = useSaveQuiz();
  const question = quiz.questions[index];
  const progress = Math.round(
    (quiz.questions.filter((item) => answers[item.id]).length / quiz.questions.length) * 100,
  );
  const isLast = index === quiz.questions.length - 1;

  function handleNext() {
    if (!answers[question.id] || save.isPending) return;
    if (!isLast) return setIndex((value) => value + 1);
    const missingIndex = quiz.questions.findIndex((item) => !answers[item.id]);
    if (missingIndex >= 0) return setIndex(missingIndex);
    save.mutate(answers, { onSuccess: onSaved });
  }

  return (
    <View className="mt-6">
      <Text className="text-right text-sm font-semibold text-teal">{progress}% đã trả lời</Text>
      <View className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <View className="h-full rounded-full bg-teal" style={{ width: `${progress}%` }} />
      </View>
      <Card className="mt-6 items-center p-5">
        <Text className="text-6xl" accessibilityElementsHidden>
          {question.emoji}
        </Text>
        <Text className="mt-4 text-xs font-semibold uppercase tracking-wider text-teal">
          Câu {index + 1}/{quiz.questions.length}
        </Text>
        <Text className="mt-2 text-center text-2xl font-bold leading-8 text-ink">
          {question.text}
        </Text>
        <View className="mt-6 w-full gap-3" accessibilityRole="radiogroup">
          {question.options.map((option, optionIndex) => {
            const active = answers[question.id] === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: active, disabled: save.isPending }}
                disabled={save.isPending}
                onPress={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                className={cn(
                  "flex-row items-center gap-3 rounded-2xl border-2 p-4",
                  active ? "border-teal bg-mint/20" : "border-slate-200 bg-white",
                )}
              >
                <View
                  className={cn(
                    "h-6 w-6 items-center justify-center rounded-full border-2",
                    active ? "border-teal bg-teal" : "border-slate-300",
                  )}
                >
                  {active ? <Check color="#ffffff" size={14} /> : null}
                </View>
                <Text className="flex-1 text-base font-medium text-ink">
                  {String.fromCharCode(65 + optionIndex)}. {option.text}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {save.isError ? (
          <View className="mt-4 w-full">
            <FormError
              message={`${save.error.message} Câu trả lời chưa được lưu. Vui lòng thử lại.`}
            />
          </View>
        ) : null}
        <View className="mt-6 w-full flex-row gap-3">
          <Button
            action="muted"
            variant="outline"
            className="h-12"
            disabled={index === 0 || save.isPending}
            onPress={() => setIndex((value) => value - 1)}
          >
            <ButtonText>Quay lại</ButtonText>
          </Button>
          <Button
            action="primary"
            className="h-12 flex-1"
            disabled={!answers[question.id]}
            loading={save.isPending}
            onPress={handleNext}
          >
            <ButtonText>
              {save.isPending ? "Đang lưu…" : isLast ? "Lưu bài khảo sát" : "Câu tiếp theo"}
            </ButtonText>
          </Button>
        </View>
      </Card>
    </View>
  );
}
