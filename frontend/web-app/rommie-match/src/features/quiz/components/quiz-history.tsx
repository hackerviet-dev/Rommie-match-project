import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMyQuiz, useQuiz } from "../hooks/use-quiz";
import { QuizResultDetails } from "./quiz-result-details";

export function QuizHistory() {
  const result = useMyQuiz();
  const questions = useQuiz();
  const [isOpen, setIsOpen] = useState(false);
  return <Card className="p-6 rounded-2xl border-0 shadow-sm">
    <div className="mb-5 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-display font-bold text-lg"><ClipboardList className="h-5 w-5 text-teal" />Bài khảo sát gần nhất</h2><Link className="text-sm font-medium text-teal hover:underline" to="/quiz">{result.data ? "Làm lại" : "Làm khảo sát"}</Link></div>
    {result.isPending ? <p role="status">Đang tải bài khảo sát…</p> : result.isError ? <div role="alert"><p>Không tải được bài khảo sát.</p><Button variant="outline" onClick={() => void result.refetch()}>Thử lại</Button></div> : result.data ? <>
      <h3 className="mb-3 font-semibold">{result.data.title}</h3><QuizResultDetails result={result.data} />
      <Button className="mt-4 rounded-full" variant="outline" onClick={() => setIsOpen(true)}>Xem câu trả lời</Button>
    </> : <p className="text-sm text-muted-foreground">Bạn chưa có bài khảo sát đã lưu.</p>}
    <Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>{result.data?.title}</DialogTitle><DialogDescription>Câu trả lời của bài khảo sát đã lưu gần nhất.</DialogDescription></DialogHeader>
      {questions.isPending ? <p role="status">Đang tải câu hỏi…</p> : questions.isError ? <div role="alert">Không tải được câu hỏi. <Button onClick={() => void questions.refetch()}>Thử lại</Button></div> : questions.data?.questions.map((question, index) => <div key={question.id} className="rounded-xl border p-4"><h3 className="font-semibold">{question.emoji} Câu {index + 1}: {question.text}</h3><p className="mt-2 text-sm text-teal">{question.options.find(option => option.id === result.data?.answers[question.id])?.text ?? "Câu trả lời không còn trong bộ câu hỏi hiện tại."}</p></div>)}
    </DialogContent></Dialog>
  </Card>;
}
