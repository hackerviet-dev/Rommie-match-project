import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, CompatRing } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { QueryState } from "@/components/common/query-state";
import { profileApi } from "@/features/profile";
import { useSavedProfiles } from "@/features/profile/hooks/use-saved-profiles";
import { safetyApi } from "@/features/profile/services/safety-api";
import { matchingApi } from "@/features/matching";
import { chatApi } from "@/features/chat/services/chat-api";
import { ApiError } from "@/services/api-error";
import { useAuthStore } from "@/features/auth";
export default function ProfilePage() {
  const { id = "" } = useParams(),
    navigate = useNavigate(),
    client = useQueryClient(),
    me = useAuthStore((s) => s.user?.id),
    saved = useSavedProfiles();
  const profile = useQuery({
    queryKey: ["profile", "public", me, id],
    queryFn: () => profileApi.getByUserId(id),
    enabled: Boolean(id),
  });
  const detail = useQuery({
    queryKey: ["matching", "detail", me, id],
    queryFn: async () => {
      try {
        return await matchingApi.detail(id);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: Boolean(id) && id !== me,
  });
  const [reportOpen, setReportOpen] = useState(false),
    [reason, setReason] = useState(""),
    [details, setDetails] = useState(""),
    [alsoBlock, setAlsoBlock] = useState(false),
    [blocked, setBlocked] = useState(false);
  const chat = useMutation({
    mutationFn: () => chatApi.start(id),
    onSuccess: (c) => navigate(`/chat?conversation=${c.id}`),
  });
  const request = useMutation({
    mutationFn: () => matchingApi.request(id),
    onSuccess: () => {
      toast.success("Đã gửi đề nghị ở ghép.");
      void client.invalidateQueries({ queryKey: ["match-requests"] });
    },
  });
  const report = useMutation({
    mutationFn: async () => {
      await safetyApi.report(id, reason, details);
      if (alsoBlock) {
        try {
          await safetyApi.block(id);
          setBlocked(true);
        } catch (e) {
          throw new Error(
            `Đã gửi báo cáo, nhưng chặn thất bại: ${e instanceof Error ? e.message : "Thử lại bằng nút Chặn."}`,
          );
        }
      }
    },
    onSuccess: () => {
      setReportOpen(false);
      toast.success("Đã gửi báo cáo.");
      void client.invalidateQueries({ queryKey: ["matching"] });
    },
  });
  const block = useMutation({
    mutationFn: () => safetyApi.block(id),
    onSuccess: () => {
      setBlocked(true);
      void client.invalidateQueries({ queryKey: ["matching"] });
      void client.invalidateQueries({ queryKey: ["saved-profiles"] });
      void client.invalidateQueries({ queryKey: ["profile", "public"] });
      void client.invalidateQueries({ queryKey: ["chat"] });
    },
  });
  if (blocked)
    return (
      <AppShell>
        <Card className="p-8">
          <h1 className="text-2xl font-semibold">Đã chặn thành viên</h1>
          <Button asChild className="mt-4">
            <Link to="/settings?section=settings">Quản lý người đã chặn</Link>
          </Button>
        </Card>
      </AppShell>
    );
  const p = profile.isError ? undefined : profile.data;
  return (
    <AppShell>
      <Link to="/matches" className="text-sm text-teal">
        ← Danh sách phù hợp
      </Link>
      <QueryState query={profile} />
      {p && (
        <>
          <Card className="mt-5 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-5">
              {p.avatarUrl ? (
                <img
                  src={p.avatarUrl}
                  alt={p.displayName}
                  className="h-24 w-24 rounded-2xl bg-mint/30"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-mint/30 text-3xl">
                  {p.displayName.slice(0, 1)}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-display font-bold">
                  {p.displayName}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  {[p.occupation, p.district, p.city]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {p.isVerified && <p className="mt-1 text-teal">Đã xác minh</p>}
              </div>
              {detail.data && (
                <CompatRing score={detail.data.match.score} size={90} />
              )}
            </div>
            <p className="mt-6 whitespace-pre-wrap">
              {p.bio || "Chưa có giới thiệu."}
            </p>
            {id !== me && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button disabled={chat.isPending} onClick={() => chat.mutate()}>
                  Nhắn tin
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    saved.query.isPending ||
                    saved.query.isError ||
                    saved.mutation.isPending
                  }
                  onClick={() =>
                    saved.mutation.mutate(
                      { id, saved: !saved.ids.includes(id) },
                      { onError: (e) => toast.error(e.message) },
                    )
                  }
                >
                  {saved.ids.includes(id) ? "Bỏ lưu hồ sơ" : "Lưu hồ sơ"}
                </Button>
                <Button
                  variant="outline"
                  disabled={request.isPending}
                  onClick={() => request.mutate()}
                >
                  Đề nghị ở ghép
                </Button>
                <Button variant="outline" onClick={() => setReportOpen(true)}>
                  Báo cáo
                </Button>
                <Button
                  variant="destructive"
                  disabled={block.isPending}
                  onClick={() => block.mutate()}
                >
                  Chặn
                </Button>
              </div>
            )}
            {[chat, request, block].map(
              (m, i) =>
                m.isError && (
                  <p role="alert" key={i} className="mt-3 text-destructive">
                    {m.error.message}
                  </p>
                ),
            )}
          </Card>
          <QueryState query={detail} />
          {detail.data && (
            <Card className="mt-5 rounded-3xl p-6">
              <h2 className="text-xl font-semibold">Mức độ phù hợp</h2>
              <p className="mt-2 text-muted-foreground">
                {detail.data.match.explanation}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {detail.data.match.breakdown.map((b) => (
                  <div key={b.key} className="rounded-xl bg-muted/50 p-4">
                    <p className="text-sm">{b.label}</p>
                    <strong className="text-xl text-navy">{b.value}%</strong>
                  </div>
                ))}
              </div>
              {detail.data.comparisonLocked ? (
                <p className="mt-5">
                  <Link to="/premium" className="text-teal underline">
                    Premium
                  </Link>{" "}
                  mở so sánh chi tiết hai hồ sơ.
                </p>
              ) : (
                <table className="mt-5 w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Tiêu chí</th>
                      <th>Bạn</th>
                      <th>{p.displayName}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data.comparison?.map((c) => (
                      <tr key={c.key} className="border-t">
                        <td className="py-3">{c.label}</td>
                        <td className="text-center">{c.mine}</td>
                        <td className="text-center">{c.theirs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                Tính lúc{" "}
                {new Date(detail.data.calculatedAt).toLocaleString("vi-VN")}
              </p>
            </Card>
          )}
        </>
      )}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Báo cáo thành viên</DialogTitle>
            <DialogDescription>
              Báo cáo sẽ được gửi cho bộ phận kiểm duyệt.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="report-reason">Lý do</Label>
          <select
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-xl border p-3"
          >
            <option value="">Chọn lý do</option>
            {[
              ["fake", "Giả mạo"],
              ["scam", "Lừa đảo"],
              ["harass", "Quấy rối"],
              ["sexual", "Nội dung tình dục"],
              ["spam", "Spam"],
              ["underage", "Chưa đủ tuổi"],
              ["other", "Khác"],
            ].map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
          <Label htmlFor="report-details">
            Chi tiết {reason === "other" ? "*" : "(tùy chọn)"}
          </Label>
          <textarea
            id="report-details"
            maxLength={2000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="min-h-28 rounded-xl border p-3"
          />
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={alsoBlock}
              onChange={(e) => setAlsoBlock(e.target.checked)}
            />
            Đồng thời chặn thành viên
          </label>
          {report.isError && (
            <p role="alert" className="text-destructive">
              {report.error.message}
            </p>
          )}
          <Button
            disabled={
              report.isPending ||
              !reason ||
              (reason === "other" && !details.trim())
            }
            onClick={() => report.mutate()}
          >
            Gửi báo cáo
          </Button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
