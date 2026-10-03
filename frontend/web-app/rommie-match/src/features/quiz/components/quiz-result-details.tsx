import { Badge } from "@/components/ui/badge";
import type { QuizResult } from "../types/quiz-types";

export function QuizResultDetails({ result }: { result: QuizResult }) {
  const costSplit = ({ split_evenly: "Chia đều", itemize: "Tính theo từng khoản", each_pays: "Ai mua người đó trả" } as Record<string, string>)[result.traits.costSplit] ?? result.traits.costSplit;
  return <div className="space-y-4 text-left">
    <p className="text-sm text-muted-foreground">Cập nhật: {new Date(result.updatedAt).toLocaleString("vi-VN")}</p>
    <div className="flex flex-wrap gap-2">{result.tags.map(tag => <Badge key={tag} className="rounded-full bg-mint/30 text-navy">{tag}</Badge>)}</div>
    <dl className="grid gap-3 sm:grid-cols-3">
      {[["Chịu ồn", result.traits.noiseTolerance], ["Gọn gàng", result.traits.tidiness], ["Dậy sớm", result.traits.earlyBird]].map(([label, value]) => <div key={label} className="rounded-xl bg-muted/40 p-3"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold text-navy">{value}/100</dd></div>)}
    </dl>
    <p className="text-sm">Chia chi phí: <span className="font-medium">{costSplit}</span></p>
  </div>;
}
