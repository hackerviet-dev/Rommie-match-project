import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useAuthStore, useStaffPath } from "@/features/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QueryState, Pagination } from "@/components/common/query-state";
import { adminApi, type PaymentStatus } from "../services/admin-api";

const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Đã thanh toán",
  pending: "Chờ thanh toán",
  failed: "Thất bại",
  expired: "Hết hạn",
  refunded: "Đã hoàn tiền",
};
const STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-600",
  expired: "bg-slate-100 text-slate-500",
  refunded: "bg-indigo-50 text-indigo-700",
};
const PLAN_LABELS: Record<string, string> = {
  premium_monthly: "Premium tháng",
  premium_yearly: "Premium năm",
};

const money = (v: number) => `${v.toLocaleString("vi-VN")}₫`;
const dateTime = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
const monthLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `T${Number(mm)}/${y.slice(2)}`;
};

function RevenueOverview() {
  const me = useAuthStore((s) => s.user?.id),
    query = useQuery({
      queryKey: ["staff", "revenue", me],
      queryFn: adminApi.revenue,
    }),
    data = query.data;
  const max = Math.max(1, ...(data?.months.map((m) => m.revenue) ?? [0]));
  const stats = data
    ? [
        { label: "Doanh thu tháng này", value: money(data.revenueThisMonth) },
        {
          label: "Tổng doanh thu",
          value: money(data.totalRevenue),
          hint: `${data.paidOrders} đơn đã thanh toán`,
        },
        {
          label: "Đã hoàn tiền",
          value: money(data.refundedAmount),
          hint: `${data.refundedOrders} đơn`,
        },
        {
          label: "Premium còn hạn",
          value: data.activePremiumUsers.toLocaleString("vi-VN"),
          hint: `${data.pendingOrders} đơn đang chờ thanh toán`,
        },
      ]
    : [];
  return (
    <>
      <QueryState query={query} />
      {data && (
        <div className="grid gap-6 xl:grid-cols-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2">
            {stats.map((s) => (
              <Card
                key={s.label}
                className="rounded-2xl border-slate-200 p-5 shadow-none"
              >
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {s.value}
                </p>
                {s.hint && (
                  <p className="mt-1 text-xs text-slate-500">{s.hint}</p>
                )}
              </Card>
            ))}
          </div>
          <Card className="rounded-2xl border-slate-200 p-5 shadow-none xl:col-span-3">
            <h2 className="font-semibold">Doanh thu 6 tháng gần nhất</h2>
            <p className="mt-1 text-xs text-slate-500">
              Chỉ tính đơn đang ở trạng thái đã thanh toán, theo giờ Việt Nam.
            </p>
            <div
              className="mt-5 flex h-48 items-end gap-3"
              role="list"
              aria-label="Doanh thu theo tháng"
            >
              {data.months.map((m) => (
                <div
                  key={m.month}
                  role="listitem"
                  aria-label={`${monthLabel(m.month)}: ${money(m.revenue)}, ${m.paidOrders} đơn`}
                  title={`${money(m.revenue)} · ${m.paidOrders} đơn`}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[11px] tabular-nums text-slate-500">
                    {m.revenue ? `${Math.round(m.revenue / 1000)}k` : ""}
                  </span>
                  <div
                    className="w-full max-w-12 rounded-t-md bg-indigo-500"
                    style={{
                      height: `${Math.max(m.revenue ? 4 : 1, (m.revenue / max) * 100)}%`,
                      opacity: m.revenue ? 1 : 0.2,
                    }}
                  />
                  <span className="text-xs text-slate-500">
                    {monthLabel(m.month)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export function PaymentsPanel() {
  const staffPath = useStaffPath();
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [q, setQ] = useState(""),
    me = useAuthStore((s) => s.user?.id),
    query = useQuery({
      queryKey: ["staff", "payments", me, status, q, page],
      queryFn: () => adminApi.payments(page, status, q),
    });
  return (
    <div>
      <h1 className="text-2xl font-display font-bold">Doanh thu & thanh toán</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Theo dõi doanh thu Premium và tra cứu mọi đơn thanh toán của thành viên.
      </p>
      <RevenueOverview />
      <Card className="mt-6 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-none">
        <div className="flex flex-wrap gap-3 border-b p-5">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              aria-label="Tìm đơn theo người mua"
              placeholder="Tìm theo tên hoặc email người mua"
              className="rounded-xl pl-10"
              value={q}
              maxLength={120}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="Lọc trạng thái đơn"
            className="rounded-xl border bg-white p-3 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Mọi trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <QueryState query={query} />
        {query.data?.totalCount === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Không có đơn thanh toán nào khớp bộ lọc.
          </p>
        )}
        {!!query.data?.items.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  {[
                    "Người mua",
                    "Gói",
                    "Số tiền",
                    "Trạng thái",
                    "Tạo lúc",
                    "Thanh toán lúc",
                    "Mã đơn",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap p-4 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-slate-50/60">
                    <td className="p-4">
                      <Link
                        to={`${staffPath}/users/${p.userId}`}
                        className="font-medium hover:underline"
                      >
                        {p.userName || "(chưa đặt tên)"}
                      </Link>
                      <div className="mt-1 text-xs text-slate-500">
                        {p.userEmail}
                      </div>
                    </td>
                    <td className="whitespace-nowrap p-4">
                      {PLAN_LABELS[p.planCode] ?? p.planCode}
                    </td>
                    <td className="whitespace-nowrap p-4 tabular-nums">
                      {money(p.amount)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-1 text-xs ${STATUS_STYLES[p.status]}`}
                      >
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-4 text-slate-500">
                      {dateTime(p.createdAt)}
                    </td>
                    <td className="whitespace-nowrap p-4 text-slate-500">
                      {dateTime(p.paidAt)}
                    </td>
                    <td className="whitespace-nowrap p-4 text-xs text-slate-500">
                      {p.provider}
                      {p.providerOrderCode ? ` · ${p.providerOrderCode}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {query.data && (
        <Pagination
          page={page}
          hasNext={query.data.hasNextPage}
          onChange={setPage}
        />
      )}
    </div>
  );
}
