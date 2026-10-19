import { useStaffPath, useAuthStore } from "@/features/auth";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState, Pagination } from "@/components/common/query-state";
import { FEEDBACK_CATEGORIES, feedbackApi } from "../services/feedback-api";

const CATEGORY_STYLES: Record<string, string> = {
  bug: "bg-rose-50 text-rose-700",
  suggestion: "bg-indigo-50 text-indigo-700",
  praise: "bg-emerald-50 text-emerald-700",
  other: "bg-slate-100 text-slate-600",
};

// Staff queue for member feedback; same layout as the report and verification queues.
export function FeedbackQueue() {
  const staffPath = useStaffPath();
  const [status, setStatus] = useState("new"),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(1),
    [notes, setNotes] = useState<Record<string, string>>({}),
    client = useQueryClient(),
    me = useAuthStore((s) => s.user?.id),
    query = useQuery({
      queryKey: ["admin", "feedback", me, page, status, category],
      queryFn: () => feedbackApi.list(page, status, category),
    }),
    review = useMutation({
      mutationFn: (id: string) => feedbackApi.review(id, notes[id] ?? ""),
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: ["admin"] });
        void client.invalidateQueries({ queryKey: ["staff"] });
        toast.success("Đã đánh dấu góp ý là đã xem.");
      },
    });
  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        <select
          aria-label="Trạng thái góp ý"
          className="rounded-xl border bg-white p-3 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="new">Chưa xem</option>
          <option value="reviewed">Đã xem</option>
          <option value="">Tất cả</option>
        </select>
        <select
          aria-label="Loại góp ý"
          className="rounded-xl border bg-white p-3 text-sm"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Mọi loại</option>
          {Object.entries(FEEDBACK_CATEGORIES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <QueryState query={query} />
      {query.data?.totalCount === 0 && (
        <p className="py-10 text-muted-foreground">Chưa có góp ý.</p>
      )}
      {query.data?.items.map((f) => (
        <Card key={f.id} className="mb-4 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">
              {f.userId ? (
                <Link
                  className="hover:text-teal"
                  to={`${staffPath}/users/${f.userId}`}
                >
                  {f.userName || f.userEmail || "Thành viên"}
                </Link>
              ) : (
                "Tài khoản đã xóa"
              )}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[f.category] ?? CATEGORY_STYLES.other}`}
            >
              {FEEDBACK_CATEGORIES[f.category] ?? f.category}
            </span>
            {f.rating !== null && (
              <span
                className="flex items-center gap-0.5"
                aria-label={`${f.rating}/5 sao`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-3.5 w-3.5 ${n <= f.rating! ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                  />
                ))}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              · {f.status === "new" ? "Chưa xem" : "Đã xem"}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm">{f.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Gửi lúc {new Date(f.createdAt).toLocaleString("vi-VN")}
            {f.pagePath && <> · từ trang {f.pagePath}</>}
          </p>
          {f.status === "reviewed" && (
            <p className="mt-3 rounded-xl bg-muted p-3 text-sm">
              {f.reviewerName ?? "Nhân viên"} đã xem
              {f.reviewedAt &&
                ` lúc ${new Date(f.reviewedAt).toLocaleString("vi-VN")}`}
              {f.staffNote && <>: {f.staffNote}</>}
            </p>
          )}
          {f.status === "new" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Input
                aria-label="Ghi chú nội bộ"
                placeholder="Ghi chú nội bộ (tùy chọn)"
                maxLength={2000}
                className="min-w-60 flex-1"
                value={notes[f.id] ?? ""}
                onChange={(e) =>
                  setNotes((n) => ({ ...n, [f.id]: e.target.value }))
                }
              />
              <Button
                disabled={review.isPending}
                onClick={() => review.mutate(f.id)}
              >
                Đánh dấu đã xem
              </Button>
            </div>
          )}
        </Card>
      ))}
      {review.isError && (
        <p role="alert" className="text-destructive">
          {review.error.message}
        </p>
      )}
      {query.data && (
        <Pagination
          page={page}
          hasNext={query.data.hasNextPage}
          onChange={setPage}
        />
      )}
    </>
  );
}
