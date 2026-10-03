import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState, Pagination } from "@/components/common/query-state";
import { adminApi } from "@/features/admin/services/admin-api";
import { ServiceManager } from "@/features/admin/components/service-manager";
import { useAuthStore } from "@/features/auth";
export default function AdminPage() {
  const me = useAuthStore((s) => s.user?.id),
    role = useAuthStore((s) => s.user?.role),
    stats = useQuery({
      queryKey: ["admin", "stats", me],
      queryFn: adminApi.stats,
      enabled: role === "admin",
    }),
    [tab, setTab] = useState("reports");
  return (
    <AppShell>
      <h1 className="text-3xl font-display font-bold">Quản trị RoomieMatch</h1>
      <p className="mt-2 text-muted-foreground">
        Số liệu và hàng đợi kiểm duyệt hiện tại.
      </p>
      {role === "admin" && <QueryState query={stats} />}
      {stats.data && (
        <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["Thành viên hoạt động", stats.data.activeUsers],
            ["Báo cáo đang mở", stats.data.openReports],
            ["Chờ xác minh", stats.data.pendingVerifications],
            ["Hồ sơ đã xác minh", stats.data.verifiedProfiles],
            ["Đăng ký 30 ngày", stats.data.newUsersLast30Days],
          ].map(([l, v]) => (
            <Card key={l} className="rounded-2xl p-5">
              <p className="text-xs text-muted-foreground">{l}</p>
              <strong className="mt-3 block text-3xl">{v}</strong>
            </Card>
          ))}
        </div>
      )}
      <div className="my-6 flex flex-wrap gap-3">
        {[
          ["reports", "Báo cáo"],
          ["verifications", "Xác minh"],
          ["services", "Dịch vụ"],
          ["refunds", "Hoàn tiền"],
        ]
          .filter(
            ([v]) =>
              role === "admin" || v === "reports" || v === "verifications",
          )
          .map(([v, l]) => (
            <Button
              key={v}
              variant={tab === v ? "default" : "outline"}
              onClick={() => setTab(v)}
            >
              {l}
            </Button>
          ))}
      </div>
      {tab === "reports" && <Reports />}
      {tab === "verifications" && <Verifications />}
      {tab === "services" && <ServiceManager />}
      {tab === "refunds" && <Refunds />}
    </AppShell>
  );
}
function Reports() {
  const [page, setPage] = useState(1),
    [notes, setNotes] = useState<Record<string, string>>({}),
    client = useQueryClient(),
    me = useAuthStore((s) => s.user?.id),
    query = useQuery({
      queryKey: ["admin", "reports", me, page],
      queryFn: () => adminApi.reports(page),
    }),
    review = useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) =>
        adminApi.reviewReport(id, status, notes[id] ?? ""),
      onSuccess: () => client.invalidateQueries({ queryKey: ["admin"] }),
    });
  return (
    <>
      <QueryState query={query} />
      {query.data?.totalCount === 0 && (
        <p className="py-10 text-muted-foreground">Chưa có báo cáo.</p>
      )}
      {query.data?.items.map((r) => (
        <Card key={r.id} className="mb-4 rounded-2xl p-5">
          <h2 className="font-semibold">
            {r.reporterName} → {r.reportedUserName}
          </h2>
          <p className="mt-2 text-sm">
            {r.reason} · {r.status}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm">{r.details}</p>
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
function Verifications() {
  const [page, setPage] = useState(1),
    [notes, setNotes] = useState<Record<string, string>>({}),
    client = useQueryClient(),
    me = useAuthStore((s) => s.user?.id),
    query = useQuery({
      queryKey: ["admin", "verifications", me, page],
      queryFn: () => adminApi.verifications(page),
    }),
    review = useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) =>
        adminApi.reviewVerification(id, status, notes[id] ?? ""),
      onSuccess: () => client.invalidateQueries({ queryKey: ["admin"] }),
    });
  return (
    <>
      <QueryState query={query} />
      {query.data?.totalCount === 0 && (
        <p className="py-10 text-muted-foreground">Chưa có hồ sơ xác minh.</p>
      )}
      {query.data?.items.map((v) => (
        <Card key={v.id} className="mb-4 rounded-2xl p-5">
          <h2 className="font-semibold">
            {v.userName} · {v.status}
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {[v.frontImageUrl, v.backImageUrl, v.selfieImageUrl]
              .filter(Boolean)
              .map((url, i) => (
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
              ))}
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
function Refunds() {
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
      onSuccess: () => client.invalidateQueries({ queryKey: ["admin"] }),
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
