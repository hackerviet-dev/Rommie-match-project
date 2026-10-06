import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { matchingApi } from "../services/matching-api";
import { useAuthStore } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/common/query-state";
import { useState } from "react";
import { SavedProfileQuizDialog, useMyQuiz } from "@/features/quiz";
export function MatchingRefresh() {
  const quiz = useMyQuiz();
  const [showSaved, setShowSaved] = useState(false);
  const userId = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    navigate = useNavigate();
  const usage = useQuery({
    queryKey: ["matching", "usage", userId],
    queryFn: matchingApi.usage,
  });
  const refresh = useMutation({
    mutationFn: matchingApi.recalculate,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["matching"] });
      navigate("/matches");
    },
  });
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Tìm người phù hợp từ hồ sơ của bạn</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        So sánh với các thành viên khác và mở danh sách kết quả. Có ứng viên
        được chấm điểm sẽ sử dụng một lượt quét.
      </p>
      <QueryState query={usage} />
      {usage.data && (
        <p className="mt-2 text-sm">
          Lượt còn lại: {usage.data.scansRemaining ?? "Không giới hạn"} · Làm
          mới {new Date(usage.data.periodResetsAt).toLocaleDateString("vi-VN")}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          disabled={
            refresh.isPending || !quiz.data || !usage.data || usage.data.scansRemaining === 0
          }
          onClick={() => refresh.mutate()}
        >
          {refresh.isPending ? "Đang tìm…" : "Tìm / cập nhật người phù hợp"}
        </Button>
        <Button variant="outline" onClick={() => setShowSaved(true)}>
          Xem kết quả đã lưu
        </Button>
        {usage.data?.scansRemaining === 0 && (
          <Button variant="outline" onClick={() => navigate("/premium")}>
            Xem Premium
          </Button>
        )}
      </div>
      <SavedProfileQuizDialog open={showSaved} onOpenChange={setShowSaved} />
      <button className="mt-3 text-sm font-semibold text-teal underline" onClick={() => navigate("/matches")}>Xem người phù hợp đã lưu</button>
      {!quiz.isPending && !quiz.data && <p className="mt-3 text-sm">Bạn cần hoàn thành khảo sát trước khi ghép đôi. <button className="font-semibold text-teal underline" onClick={() => navigate("/quiz")}>Làm khảo sát</button></p>}
      {refresh.isError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {refresh.error.message}
        </p>
      )}
    </div>
  );
}
