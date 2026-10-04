import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { Logo } from "@/layouts/main-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMyQuiz, useQuiz, useSaveQuiz } from "../hooks/use-quiz";
import { QuizResultDetails } from "./quiz-result-details";
import { QuizMatchingRefresh } from "./quiz-matching-refresh";
import type { Quiz } from "../types/quiz-types";

export function QuizScreen() {
  const quiz = useQuiz();
  const saved = useMyQuiz();
  const [isRetaking, setIsRetaking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  function handleRetake() { setIsRetaking(true); setAttempt(value => value + 1); }
  return <div className="min-h-screen bg-gradient-to-br from-background to-mint/10 p-4 sm:p-8"><div className="mx-auto max-w-2xl">
    <div className="mb-6 flex items-center justify-between"><Logo /><Link to="/dashboard" className="text-sm text-teal hover:underline">Về dashboard</Link></div>
    {quiz.isPending || saved.isPending ? <Card className="p-10 text-center" role="status">Đang tải khảo sát…</Card> : quiz.isError || saved.isError ? <Card className="p-10 text-center" role="alert"><p>Không tải được khảo sát. Vui lòng thử lại.</p><Button className="mt-4" onClick={() => { void quiz.refetch(); void saved.refetch(); }}>Thử lại</Button></Card> : !quiz.data?.questions.length ? <p role="alert">Chưa có bộ câu hỏi khảo sát.</p> : saved.data && !isRetaking ? <Card className="p-8 sm:p-10 rounded-3xl border-0 shadow-xl">
      <Sparkles className="h-9 w-9 text-teal" /><h1 className="mt-4 mb-5 text-2xl font-display font-bold">Kết quả khảo sát đã lưu</h1><QuizResultDetails result={saved.data} />
      <QuizMatchingRefresh key={saved.data.updatedAt} />
      <div className="mt-6 flex flex-wrap gap-3"><Button onClick={handleRetake}>Làm lại khảo sát</Button><Button asChild variant="outline"><Link to="/matches">Khám phá ở ghép</Link></Button></div>
    </Card> : <QuizQuestionnaire key={`${quiz.data.code}-${attempt}`} quiz={quiz.data} initialAnswers={saved.data?.answers ?? {}} onSaved={() => setIsRetaking(false)} />}
  </div></div>;
}

type QuizQuestionnaireProps = { quiz: Quiz; initialAnswers: Record<string, string>; onSaved: () => void };

function QuizQuestionnaire({ quiz, initialAnswers, onSaved }: QuizQuestionnaireProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(quiz.questions.filter(question => question.options.some(option => option.id === initialAnswers[question.id])).map(question => [question.id, initialAnswers[question.id]])));
  const save = useSaveQuiz();
  const question = quiz.questions[index];
  const progress = Math.round(quiz.questions.filter(item => answers[item.id]).length / quiz.questions.length * 100);
  function handleNext() {
    if (!answers[question.id] || save.isPending) return;
    if (index < quiz.questions.length - 1) setIndex(value => value + 1);
    else {
      const missingIndex = quiz.questions.findIndex(item => !answers[item.id]);
      if (missingIndex >= 0) { setIndex(missingIndex); return; }
      save.mutate(answers, { onSuccess: onSaved });
    }
  }
  return <><div className="mb-3 text-right text-sm font-semibold text-teal">{progress}% đã trả lời</div><Progress value={progress} className="h-2 mb-8" />
    <Card className="p-8 sm:p-12 rounded-3xl border-0 shadow-xl text-center">
      <div className="text-7xl mb-6" aria-hidden="true">{question.emoji}</div><p className="text-xs uppercase tracking-wider text-teal font-semibold">Câu {index + 1}/{quiz.questions.length}</p><h1 className="mt-3 text-2xl sm:text-3xl font-display font-bold leading-tight">{question.text}</h1>
      <div className="mt-8 space-y-3" role="group" aria-label="Chọn câu trả lời">{question.options.map((option, optionIndex) => {
        const isActive = answers[question.id] === option.id;
        return <button key={option.id} disabled={save.isPending} aria-pressed={isActive} onClick={() => setAnswers(current => ({ ...current, [question.id]: option.id }))} className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${isActive ? "border-teal bg-mint/20 shadow-md" : "border-border hover:border-teal/50 hover:bg-muted/50"}`}><span className={`h-6 w-6 rounded-full grid place-items-center border-2 shrink-0 ${isActive ? "border-teal bg-teal text-white" : "border-border"}`}>{isActive && <Check className="h-3.5 w-3.5" />}</span><span className="font-medium">{String.fromCharCode(65 + optionIndex)}. {option.text}</span></button>;
      })}</div>
      {save.isError && <p role="alert" className="mt-4 text-sm text-destructive">{save.error.message} Câu trả lời chưa được lưu. Vui lòng thử lại.</p>}
      <div className="mt-8 flex gap-3"><Button variant="outline" disabled={index === 0 || save.isPending} onClick={() => setIndex(value => value - 1)}>Quay lại</Button><Button onClick={handleNext} disabled={!answers[question.id] || save.isPending} className="flex-1 h-12 rounded-xl bg-navy hover:bg-navy/90 text-white">{save.isPending ? "Đang lưu…" : index < quiz.questions.length - 1 ? "Câu tiếp theo" : "Lưu bài khảo sát"}</Button></div>
    </Card></>;
}
