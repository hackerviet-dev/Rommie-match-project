import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState, Pagination } from "@/components/common/query-state";
import { adminApi } from "../services/admin-api";
import { useAuthStore } from "@/features/auth";
export function Reports() {
  const [status, setStatus] = useState("open"),
    [page, setPage] = useState(1),
    [notes, setNotes] = useState<Record<string, string>>({}),
    client = useQueryClient(),
    me = useAuthStore((s) => s.user?.id),
    query = useQuery({
      queryKey: ["admin", "reports", me, page, status],
      queryFn: () => adminApi.reports(page, status),
    }),
    review = useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) =>
        adminApi.reviewReport(id, status, notes[id] ?? ""),
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: ["admin"] });
        void client.invalidateQueries({ queryKey: ["staff"] });
        toast.success("Đã lưu kết quả xử lý.");
      },
    });
  return (
    <>
      <select
        aria-label="Trạng thái báo cáo"
        className="mb-5 rounded-xl border bg-white p-3 text-sm"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
        }}
      >
        <option value="open">Đang mở</option>
        <option value="resolved">Đã xử lý</option>
        <option value="dismissed">Đã bác</option>
        <option value="">Tất cả</option>
      </select>
      <QueryState query={query} />
      {query.data?.totalCount === 0 && (
        <p className="py-10 text-muted-foreground">Chưa có báo cáo.</p>
      )}
      {query.data?.items.map((r) => (
        <Card key={r.id} className="mb-4 rounded-2xl p-5">
          <h2 className="font-semibold">
            <Link
              className="hover:text-teal"
              to={`/admin/users/${r.reporterId}`}
            >
              {r.reporterName}
            </Link>{" "}
            →{" "}
            <Link
              className="hover:text-teal"
              to={`/admin/users/${r.reportedUserId}`}
            >
              {r.reportedUserName}
            </Link>
          </h2>
          <p className="mt-2 text-sm">
            {{
              scam: "Nghi lừa đảo",
              harassment: "Quấy rối",
              spam: "Spam",
              inappropriate: "Nội dung không phù hợp",
              other: "Khác",
            }[r.reason] ?? r.reason}{" "}
            ·{" "}
            {{ open: "Đang mở", resolved: "Đã xử lý", dismissed: "Đã bác" }[
              r.status
            ] ?? r.status}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm">{r.details}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Gửi lúc {new Date(r.createdAt).toLocaleString("vi-VN")}
          </p>
          {r.resolutionNote && (
            <p className="mt-3 rounded-xl bg-muted p-3 text-sm">
              Kết luận: {r.resolutionNote}
            </p>
          )}
          {r.status === "open" && (
            <>
              <Input
                aria-label="Ghi chú xử lý"
                maxLength={2000}
                className="mt-3"
                value={notes[r.id] ?? ""}
                onChange={(e) =>
                  setNotes((n) => ({ ...n, [r.id]: e.target.value }))
                }
              />
              <div className="mt-3 flex gap-2">
                <Button
                  disabled={review.isPending}
                  onClick={() =>
                    review.mutate({ id: r.id, status: "resolved" })
                  }
                >
                  Đã xử lý
                </Button>
                <Button
                  variant="outline"
                  disabled={review.isPending}
                  onClick={() =>
                    review.mutate({ id: r.id, status: "dismissed" })
                  }
                >
                  Bác báo cáo
                </Button>
              </div>
            </>
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
export function Verifications() {
  const [status, setStatus] = useState("pending"),
    [page, setPage] = useState(1),
    [notes, setNotes] = useState<Record<string, string>>({}),
    client = useQueryClient(),
    me = useAuthStore((s) => s.user?.id),
    query = useQuery({
      queryKey: ["admin", "verifications", me, page, status],
      queryFn: () => adminApi.verifications(page, status),
    }),
    review = useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) =>
        adminApi.reviewVerification(id, status, notes[id] ?? ""),
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: ["admin"] });
        void client.invalidateQueries({ queryKey: ["staff"] });
        toast.success("Đã lưu kết quả xử lý.");
      },
    });
  return (
    <>
      <select
        aria-label="Trạng thái xác minh"
        className="mb-5 rounded-xl border bg-white p-3 text-sm"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
        }}
      >
        <option value="pending">Chờ duyệt</option>
        <option value="approved">Đã duyệt</option>
        <option value="rejected">Đã từ chối</option>
        <option value="">Tất cả</option>
      </select>
      <QueryState query={query} />
      {query.data?.totalCount === 0 && (
        <p className="py-10 text-muted-foreground">Chưa có hồ sơ xác minh.</p>
      )}
      {query.data?.items.map((v) => (
        <Card key={v.id} className="mb-4 rounded-2xl p-5">
          <h2 className="font-semibold">
            <Link className="hover:text-teal" to={`/admin/users/${v.userId}`}>
              {v.userName}
            </Link>{" "}
            ·{" "}
            {{
              pending: "Chờ duyệt",
              approved: "Đã duyệt",
              rejected: "Đã từ chối",
            }[v.status] ?? v.status}
          </h2>
          {v.rejectionReason && (
            <p className="mt-3 text-sm">Lý do: {v.rejectionReason}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {[v.frontImageUrl, v.backImageUrl, v.selfieImageUrl].map(
              (url, i) =>
                url && (
                  <a
                    key={i}
                    href={url!}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-teal underline"
                  >
                    Xem{" "}
                    {i === 0
                      ? "mặt trước"
                      : i === 1
                        ? "mặt sau"
                        : "ảnh chân dung"}
                  </a>
                ),
            )}
          </div>
          {v.status === "pending" && (
            <>
              <Input
                aria-label="Lý do từ chối"
                placeholder="Lý do khi từ chối"
                maxLength={2000}
                className="mt-4"
                value={notes[v.id] ?? ""}
                onChange={(e) =>
                  setNotes((n) => ({ ...n, [v.id]: e.target.value }))
                }
              />
              <div className="mt-3 flex gap-2">
                <Button
                  disabled={review.isPending}
                  onClick={() =>
                    review.mutate({ id: v.id, status: "approved" })
                  }
                >
                  Duyệt
                </Button>
                <Button
                  variant="destructive"
                  disabled={review.isPending || !notes[v.id]?.trim()}
                  onClick={() =>
                    review.mutate({ id: v.id, status: "rejected" })
                  }
                >
                  Từ chối
                </Button>
              </div>
            </>
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
export function Refunds() {
  const [page, setPage] = useState(1),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [refs, setRefs] = useState<Record<string, string>>({}),
    client = useQueryClient(),
    me = useAuthStore((s) => s.user?.id),
    query = useQuery({
      queryKey: ["admin", "refunds", me, page],
      queryFn: () => adminApi.refunds(page),
    }),
    resolve = useMutation({
      mutationFn: ({
        id,
        action,
      }: {
        id: string;
        action: "approve" | "reject";
      }) => adminApi.resolveRefund(id, action, notes[id] ?? "", refs[id]),
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: ["admin"] });
        void client.invalidateQueries({ queryKey: ["staff"] });
        toast.success("Đã lưu kết quả xử lý.");
      },
    });
  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Chỉ xác nhận đã hoàn tiền sau khi chuyển khoản thực tế cho người mua.
      </p>
      <QueryState query={query} />
      {query.data?.totalCount === 0 && (
        <p className="py-10 text-muted-foreground">
          Chưa có yêu cầu hoàn tiền.
        </p>
      )}
      {query.data?.items.map((r) => (
        <Card key={r.id} className="mb-4 rounded-2xl p-5">
          <h2 className="font-semibold">
            {r.userName} · {r.amount.toLocaleString("vi-VN")}₫
          </h2>
          <p className="mt-2 text-sm">
            {r.userEmail} · {r.status}
          </p>
          <p className="mt-2 text-sm">{r.reason}</p>
          {r.status === "pending" && (
            <>
              <Input
                aria-label="Mã giao dịch chuyển khoản hoàn tiền"
                placeholder="Mã chuyển khoản đã hoàn tiền"
                maxLength={200}
                className="mt-3"
                value={refs[r.id] ?? ""}
                onChange={(e) =>
                  setRefs((n) => ({ ...n, [r.id]: e.target.value }))
                }
              />
              <Input
                aria-label="Ghi chú hoàn tiền"
                placeholder="Ghi chú / lý do từ chối"
                maxLength={2000}
                className="mt-3"
                value={notes[r.id] ?? ""}
                onChange={(e) =>
                  setNotes((n) => ({ ...n, [r.id]: e.target.value }))
                }
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  disabled={resolve.isPending || !refs[r.id]?.trim()}
                  onClick={() =>
                    resolve.mutate({ id: r.id, action: "approve" })
                  }
                >
                  Xác nhận đã chuyển khoản
                </Button>
                <Button
                  variant="outline"
                  disabled={resolve.isPending || !notes[r.id]?.trim()}
                  onClick={() => resolve.mutate({ id: r.id, action: "reject" })}
                >
                  Từ chối yêu cầu
                </Button>
              </div>
            </>
          )}
        </Card>
      ))}
      {resolve.isError && (
        <p role="alert" className="text-destructive">
          {resolve.error.message}
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
