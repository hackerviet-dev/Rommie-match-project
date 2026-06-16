import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Logo } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { quizQuestions } from "@/lib/mock-data";
import { Sparkles, Check } from "lucide-react";

export default function Quiz() {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const nav = useNavigate();
  const q = quizQuestions[i];
  const pct = Math.round(((i + (picked !== null ? 1 : 0)) / quizQuestions.length) * 100);

  const next = () => {
    if (picked === null) return;
    if (i < quizQuestions.length - 1) {
      setI(i + 1);
      setPicked(null);
    } else setDone(true);
  };

  if (done)
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-mint/30 to-teal/10 p-4">
        <Card className="max-w-md w-full p-10 rounded-3xl border-0 shadow-xl text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl gradient-brand grid place-items-center text-white shadow-lg">
            <Sparkles className="h-9 w-9" />
          </div>
          <h2 className="mt-6 text-3xl font-display font-bold">Hoàn thành! 🎉</h2>
          <p className="mt-3 text-muted-foreground">
            Chúng tôi tìm được <span className="text-navy font-bold">6 người rất hợp</span> với bạn.
            Hoàn thiện hồ sơ: <span className="text-teal font-bold">100%</span>
          </p>
          <Button
            onClick={() => nav("/matches")}
            className="mt-8 w-full h-12 rounded-xl bg-navy hover:bg-navy/90 text-white"
          >
            Xem kết quả ghép đôi
          </Button>
        </Card>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-mint/10 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Logo />
          <span className="text-sm font-semibold text-teal">{pct}% hoàn thành</span>
        </div>
        <Progress value={pct} className="h-2 mb-8" />

        <Card className="p-8 sm:p-12 rounded-3xl border-0 shadow-xl text-center">
          <div className="mx-auto text-7xl mb-6">{q.emoji}</div>
          <div className="text-xs uppercase tracking-wider text-teal font-semibold">
            Câu {i + 1}/{quizQuestions.length}
          </div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-display font-bold leading-tight">{q.q}</h2>

          <div className="mt-8 space-y-3">
            {q.options.map((o, idx) => {
              const active = picked === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setPicked(idx)}
                  className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${active ? "border-teal bg-mint/20 shadow-md" : "border-border hover:border-teal/50 hover:bg-muted/50"}`}
                >
                  <div
                    className={`h-6 w-6 rounded-full grid place-items-center border-2 shrink-0 ${active ? "border-teal bg-teal text-white" : "border-border"}`}
                  >
                    {active && <Check className="h-3.5 w-3.5" />}
                  </div>
                  <span className="font-medium">
                    {String.fromCharCode(65 + idx)}. {o}
                  </span>
                </button>
              );
            })}
          </div>

          <Button
            onClick={next}
            disabled={picked === null}
            className="mt-8 w-full h-12 rounded-xl bg-navy hover:bg-navy/90 text-white disabled:opacity-50"
          >
            {i < quizQuestions.length - 1 ? "Câu tiếp theo" : "Hoàn thành"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
