import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Scale, Send } from "lucide-react";
import { workspaceApi } from "../services/workspace-api";
import {
  disputeSchema,
  messageSchema,
  reviewSchema,
} from "../schemas/workspace-schemas";
import { chatApi } from "@/features/chat/services/chat-api";
import { profileApi } from "@/features/profile";
import { useAuthStore } from "@/features/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState, Pagination } from "@/components/common/query-state";
import { disputeStatusLabel } from "../utils/workspace-labels";
export function DisputesPanel({ staff = false }: { staff?: boolean }) {
  const [params, setParams] = useSearchParams(),
    id = params.get("case") ?? "",
    [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    me = useAuthStore((s) => s.user),
    client = useQueryClient();
  const list = useQuery({
    queryKey: ["disputes", staff, me?.id, page, status],
    queryFn: () => workspaceApi.disputes(staff, page, status),
  });
  const detail = useQuery({
    queryKey: ["disputes", "detail", staff, me?.id, id],
    queryFn: () => workspaceApi.dispute(id, staff),
    enabled: !!id,
  });
  const form = useForm<z.infer<typeof disputeSchema>>({
    resolver: zodResolver(disputeSchema),
    defaultValues: {
      respondentId: params.get("respondent") ?? "",
      groupId: params.get("group") ?? "",
      roomId: params.get("room") ?? "",
      title: "",
      details: "",
    },
  });
  const groups = useQuery({
    queryKey: ["groups", "dispute-options", me?.id],
    queryFn: () => workspaceApi.groups(false),
    enabled: !staff,
  });
  const groupId = form.watch("groupId");
  const group = useQuery({
    queryKey: ["groups", "dispute-group", me?.id, groupId],
    queryFn: () => workspaceApi.group(groupId!, false),
    enabled: !staff && !!groupId,
  });
  const partners = useQuery({
    queryKey: ["chat", "dispute-options", me?.id],
    queryFn: () => chatApi.list(),
    enabled: !staff,
  });
  const target = params.get("respondent");
  const targetProfile = useQuery({
    queryKey: ["profile", "dispute-target", me?.id, target],
    queryFn: () => profileApi.getByUserId(target!),
    enabled: !staff && !!target,
  });
  const candidates = Array.from(
    new Map(
      [
        ...(!groupId
          ? (partners.data?.items.map((c) => ({
              id: c.partner.userId,
              name: c.partner.displayName,
            })) ?? [])
          : []),
        ...(group.data?.members
          .filter((m) => m.status === "active" && m.userId !== me?.id)
          .map((m) => ({ id: m.userId, name: m.displayName })) ?? []),
        ...(!groupId && target && targetProfile.data
          ? [{ id: target, name: targetProfile.data.displayName }]
          : []),
      ].map((c) => [c.id, c]),
    ).values(),
  );
  const message = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: "" },
  });
  const review = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { status: "investigating", note: "" },
  });
  const resetMessage = message.reset,
    resetReview = review.reset;
  useEffect(() => {
    resetMessage({ content: "" });
    resetReview({ status: "investigating", note: "" });
  }, [id, resetMessage, resetReview]);
  const involved =
    staff &&
    (detail.data?.complainantId === me?.id ||
      detail.data?.respondentId === me?.id);
  const update = () => {
    void client.invalidateQueries({ queryKey: ["disputes"] });
    void client.invalidateQueries({ queryKey: ["staff", "overview"] });
  };
  const create = useMutation({
    mutationFn: (v: z.infer<typeof disputeSchema>) =>
      workspaceApi.createDispute({
        ...v,
        roomId: v.roomId || undefined,
        groupId: v.groupId || undefined,
      }),
    onSuccess: (r) => {
      update();
      form.reset();
      setParams({ case: r.id });
      toast.success("Đã gửi yêu cầu hòa giải.");
    },
    onError: (e) => toast.error(e.message),
  });
  const send = useMutation({
    mutationFn: (v: z.infer<typeof messageSchema>) =>
      workspaceApi.message(id, staff, v.content),
    onSuccess: () => {
      update();
      message.reset();
    },
    onError: (e) => toast.error(e.message),
  });
  const resolve = useMutation({
    mutationFn: (v: z.infer<typeof reviewSchema>) =>
      workspaceApi.review(id, v.status, v.note),
    onSuccess: () => {
      update();
      review.reset();
      toast.success("Đã cập nhật hồ sơ tranh chấp.");
    },
    onError: (e) => toast.error(e.message),
  });
  const closed =
    detail.data && ["resolved", "dismissed"].includes(detail.data.status);
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">
        {staff ? "Xử lý tranh chấp" : "Yêu cầu hòa giải"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Lưu diễn biến và ý kiến của hai bên. Kết luận xử lý được giữ trong hồ
        sơ.
      </p>
      {!staff && !id && (
        <Card className="mt-6 rounded-2xl p-6">
          <h2 className="font-semibold">Tạo yêu cầu hỗ trợ</h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit((v) => create.mutate(v))}
          >
            <label className="text-sm">
              Nhóm liên quan (tùy chọn)
              <select
                className="mt-2 w-full rounded-xl border bg-white p-3"
                {...form.register("groupId")}
                value={form.watch("groupId") ?? ""}
              >
                <option value="">Không chọn nhóm</option>
                {groups.data?.items
                  .filter((g) => g.myStatus === "active")
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm">
              Bên liên quan
              <select
                className="mt-2 w-full rounded-xl border bg-white p-3"
                {...form.register("respondentId")}
                value={form.watch("respondentId")}
              >
                <option value="">Chọn người đã kết nối / trong nhóm</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.respondentId?.message}
              </p>
            </label>
            <label className="text-sm sm:col-span-2">
              Tiêu đề
              <Input
                className="mt-2"
                placeholder="VD: Chưa thống nhất việc hoàn tiền cọc"
                maxLength={180}
                {...form.register("title")}
              />
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.title?.message}
              </p>
            </label>
            <label className="text-sm sm:col-span-2">
              Mô tả sự việc và bằng chứng
              <textarea
                className="mt-2 min-h-32 w-full rounded-xl border bg-white p-3"
                placeholder="Ghi rõ thời điểm, khoản tiền, thỏa thuận và các liên kết bằng chứng liên quan…"
                maxLength={5000}
                {...form.register("details")}
              />
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.details?.message}
              </p>
            </label>
            <Button className="w-fit" disabled={create.isPending}>
              Gửi yêu cầu hòa giải
            </Button>
          </form>
        </Card>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          {staff && (
            <select
              aria-label="Trạng thái tranh chấp"
              className="mb-4 w-full rounded-xl border bg-white p-3 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Mọi trạng thái</option>
              {["open", "investigating", "resolved", "dismissed"].map((s) => (
                <option key={s} value={s}>
                  {disputeStatusLabel(s)}
                </option>
              ))}
            </select>
          )}
          {!staff && id && (
            <Button
              className="mb-4"
              variant="outline"
              onClick={() => {
                form.reset({
                  respondentId: "",
                  groupId: "",
                  roomId: "",
                  title: "",
                  details: "",
                });
                setParams({});
              }}
            >
              Yêu cầu mới
            </Button>
          )}
          <QueryState query={list} />
          <div className="space-y-3">
            {list.data?.items.map((d) => (
              <button
                key={d.id}
                className={`w-full rounded-2xl border bg-white p-4 text-left ${id === d.id ? "border-indigo-300" : ""}`}
                onClick={() => setParams({ case: d.id })}
              >
                <h2 className="font-semibold">{d.title}</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {d.complainantName} ↔ {d.respondentName}
                </p>
                <span className="mt-3 inline-block rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-600">
                  {disputeStatusLabel(d.status)}
                </span>
              </button>
            ))}
          </div>
          {list.data?.totalCount === 0 && (
            <Card className="rounded-2xl p-6 text-sm text-muted-foreground">
              Chưa có tranh chấp.
            </Card>
          )}
          {list.data && (
            <Pagination
              page={page}
              hasNext={list.data.hasNextPage}
              onChange={setPage}
            />
          )}
        </div>
        <div>
          {id && <QueryState query={detail} />}
          {!id && (
            <Card className="rounded-2xl p-8 text-muted-foreground">
              <Scale className="mb-4 h-8 w-8 text-indigo-400" />
              Chọn hồ sơ để xem diễn biến và xử lý.
            </Card>
          )}
          {detail.data && !detail.isError && (
            <Card className="rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{detail.data.title}</h2>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-600">
                  {disputeStatusLabel(detail.data.status)}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {detail.data.complainantName} ↔ {detail.data.respondentName}
              </p>
              <p className="mt-5 whitespace-pre-wrap rounded-xl bg-muted/30 p-4 text-sm">
                {detail.data.details}
              </p>
              <h3 className="mt-6 font-semibold">Trao đổi trong hồ sơ</h3>
              <div className="mt-4 space-y-4">
                {detail.data.messages?.map((m) => (
                  <div key={m.id} className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">
                      {m.authorName ?? "Tài khoản đã xóa"} ·{" "}
                      {new Date(m.createdAt).toLocaleString("vi-VN")}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      {m.content}
                    </p>
                  </div>
                ))}
              </div>
              {!closed && (
                <form
                  className="mt-4 space-y-2"
                  onSubmit={message.handleSubmit((v) => send.mutate(v))}
                >
                  <textarea
                    aria-label="Phản hồi tranh chấp"
                    placeholder="Bổ sung thông tin hoặc phản hồi bên liên quan"
                    maxLength={4000}
                    className="min-h-24 w-full rounded-xl border bg-white p-3 text-sm"
                    {...message.register("content")}
                  />
                  <p className="text-xs text-destructive">
                    {message.formState.errors.content?.message}
                  </p>
                  <Button disabled={send.isPending}>
                    <Send className="h-4 w-4" />
                    Gửi phản hồi
                  </Button>
                </form>
              )}
              {detail.data.resolutionNote && (
                <div className="mt-6 rounded-xl bg-emerald-50 p-4">
                  <h3 className="text-sm font-semibold text-emerald-800">
                    Ghi nhận xử lý
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-900">
                    {detail.data.resolutionNote}
                  </p>
                </div>
              )}
              {staff && !closed && involved && (
                <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                  Bạn là bên liên quan trong hồ sơ này. Kiểm duyệt viên khác
                  phải tiếp nhận và kết luận.
                </p>
              )}
              {staff && !closed && !involved && (
                <form
                  className="mt-6 space-y-3 border-t pt-5"
                  onSubmit={review.handleSubmit((v) => resolve.mutate(v))}
                >
                  <h3 className="font-semibold">Kết luận kiểm duyệt</h3>
                  <select
                    aria-label="Kết quả xử lý tranh chấp"
                    className="w-full rounded-xl border bg-white p-3 text-sm"
                    {...review.register("status")}
                  >
                    <option value="investigating">
                      Tiếp nhận / đang hòa giải
                    </option>
                    <option value="resolved">Đã giải quyết</option>
                    <option value="dismissed">Không đủ cơ sở</option>
                  </select>
                  <textarea
                    aria-label="Ghi chú xử lý tranh chấp"
                    placeholder="Lý do, căn cứ và hướng xử lý"
                    maxLength={2000}
                    className="min-h-24 w-full rounded-xl border p-3 text-sm"
                    {...review.register("note")}
                  />
                  <p className="text-xs text-destructive">
                    {review.formState.errors.note?.message}
                  </p>
                  <Button disabled={resolve.isPending}>Lưu kết luận</Button>
                </form>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
