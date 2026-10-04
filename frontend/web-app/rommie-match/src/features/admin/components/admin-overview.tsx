import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Building2,
  Scale,
  Flag,
  ShieldCheck,
  ArrowUpRight,
  Users,
  UsersRound,
  RefreshCw,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QueryState } from "@/components/common/query-state";
import { staffApi } from "../services/staff-api";
import { adminApi } from "../services/admin-api";

export function AdminOverview() {
  const me = useAuthStore((s) => s.user);
  const overview = useQuery({
    queryKey: ["staff", "overview", me?.id],
    queryFn: staffApi.overview,
  });
  const stats = useQuery({
    queryKey: ["admin", "stats", me?.id],
    queryFn: adminApi.stats,
    enabled: me?.role === "admin",
  });
  const rooms = useQuery({
    queryKey: ["staff", "overview-rooms", me?.id],
    queryFn: () => staffApi.rooms("pending"),
  });
  const audit = useQuery({
    queryKey: ["staff", "overview-audit", me?.id],
    queryFn: () => staffApi.audit(),
    enabled: me?.role === "admin",
  });
  const queues = [
    {
      label: "Tin đăng chờ duyệt",
      value: overview.data?.pendingRooms,
      path: "rooms",
      icon: Building2,
      color: "bg-indigo-50 text-indigo-600",
      bar: "bg-indigo-500",
    },
    {
      label: "Tranh chấp đang mở",
      value: overview.data?.openDisputes,
      path: "disputes",
      icon: Scale,
      color: "bg-amber-50 text-amber-600",
      bar: "bg-amber-500",
    },
    {
      label: "Báo cáo vi phạm",
      value: overview.data?.openReports,
      path: "reports",
      icon: Flag,
      color: "bg-rose-50 text-rose-600",
      bar: "bg-rose-500",
    },
    {
      label: "Xác minh chờ duyệt",
      value: overview.data?.pendingVerifications,
      path: "verifications",
      icon: ShieldCheck,
      color: "bg-teal-50 text-teal-600",
      bar: "bg-teal-500",
    },
  ];
  const total = queues.reduce((sum, q) => sum + (q.value ?? 0), 0);
  const isRefreshing =
    overview.isFetching ||
    rooms.isFetching ||
    stats.isFetching ||
    audit.isFetching;
  function handleRefresh() {
    void overview.refetch();
    void rooms.refetch();
    if (me?.role === "admin") {
      void stats.refetch();
      void audit.refetch();
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
            Trung tâm điều hành
          </p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Tổng quan {me?.role === "admin" ? "quản trị" : "kiểm duyệt"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Theo dõi cộng đồng và xử lý các yêu cầu đang chờ.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl bg-white"
          disabled={isRefreshing}
          onClick={handleRefresh}
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Làm mới
        </Button>
      </div>
      <QueryState query={overview} />
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-800 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-[32px] border-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-indigo-100">
              <Clock3 className="h-3.5 w-3.5" />
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <h2 className="mt-4 text-xl font-semibold">
              Chào {me?.name ?? "bạn"}, công việc hôm nay
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
              {overview.data && !overview.isError
                ? total > 0
                  ? `Có ${total.toLocaleString("vi-VN")} yêu cầu đang chờ trong các hàng đợi kiểm duyệt.`
                  : "Các hàng đợi kiểm duyệt hiện đã được xử lý hết."
                : "Đang tải tình trạng hàng đợi kiểm duyệt."}
            </p>
          </div>
          <Link
            to="/admin/rooms"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-indigo-950 hover:bg-indigo-50"
          >
            Mở hàng đợi tin đăng
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {queues.map((q) => (
          <Link key={q.path} to={`/admin/${q.path}`} className="group">
            <Card className="h-full rounded-2xl border-slate-200 p-5 shadow-none transition hover:border-indigo-200 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl ${q.color}`}
                >
                  <q.icon className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
              </div>
              <p className="mt-5 text-3xl font-semibold tabular-nums">
                {overview.isError
                  ? "—"
                  : (q.value?.toLocaleString("vi-VN") ?? "…")}
              </p>
              <p className="mt-1 text-sm text-slate-500">{q.label}</p>
              <div className="mt-4 border-t pt-3 text-xs text-slate-400">
                Xem và xử lý yêu cầu
              </div>
            </Card>
          </Link>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border-slate-200 p-6 shadow-none lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Phân bổ hàng đợi</h2>
              <p className="mt-1 text-xs text-slate-500">
                Số yêu cầu hiện tại theo từng nghiệp vụ
              </p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-600">
              {overview.isError
                ? "—"
                : overview.data
                  ? `${total} yêu cầu`
                  : "Đang tải"}
            </span>
          </div>
          <div className="mt-6 space-y-5">
            {queues.map((q) => (
              <Link
                key={q.path}
                to={`/admin/${q.path}`}
                className="block rounded-lg focus-visible:outline focus-visible:outline-indigo-500"
              >
                <div className="mb-2 flex justify-between gap-3 text-sm">
                  <span className="text-slate-600">{q.label}</span>
                  <span className="font-semibold tabular-nums">
                    {overview.isError ? "—" : (q.value ?? "…")}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${q.bar}`}
                    style={{
                      width: `${!overview.isError && total ? ((q.value ?? 0) / total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
          {overview.data && !overview.isError && total === 0 && (
            <p className="mt-5 flex items-center gap-2 text-xs text-teal-700">
              <CheckCircle2 className="h-4 w-4" />
              Chưa có yêu cầu cần xử lý.
            </p>
          )}
        </Card>
        <Card className="rounded-2xl border-slate-200 p-6 shadow-none">
          <h2 className="font-semibold">Cộng đồng RoomieMatch</h2>
          {me?.role === "admin" && <QueryState query={stats} />}
          <div className="mt-5 space-y-4">
            {(me?.role === "admin"
              ? [
                  {
                    label: "Tài khoản hoạt động",
                    value: stats.data?.activeUsers,
                    icon: Users,
                  },
                  {
                    label: "Đăng ký trong 30 ngày",
                    value: stats.data?.newUsersLast30Days,
                    icon: Users,
                  },
                  {
                    label: "Hồ sơ đã xác minh",
                    value: stats.data?.verifiedProfiles,
                    icon: ShieldCheck,
                  },
                ]
              : []
            ).map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-3 border-b border-slate-100 pb-4"
              >
                <c.icon className="h-5 w-5 text-slate-400" />
                <p className="flex-1 text-xs text-slate-500">{c.label}</p>
                <span className="text-xl font-semibold tabular-nums">
                  {stats.isError ? "—" : (c.value ?? "…")}
                </span>
              </div>
            ))}
            <Link to="/admin/groups" className="flex items-center gap-3">
              <UsersRound className="h-5 w-5 text-indigo-500" />
              <span className="flex-1 text-sm text-slate-600">Nhóm ở ghép</span>
              <span className="text-xl font-semibold">
                {overview.isError ? "—" : (overview.data?.groups ?? "…")}
              </span>
            </Link>
          </div>
          <Link
            to="/admin/users"
            className="mt-6 flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700"
          >
            Tra cứu thành viên
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
      <div
        className={`grid gap-6 ${me?.role === "admin" ? "lg:grid-cols-3" : ""}`}
      >
        <Card className="min-w-0 overflow-hidden rounded-2xl border-slate-200 shadow-none lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b p-5">
            <div>
              <h2 className="font-semibold">Tin đăng chờ kiểm duyệt</h2>
              <p className="mt-1 text-xs text-slate-500">
                Tối đa 5 tin trong trang đầu của hàng đợi
              </p>
            </div>
            <Link
              to="/admin/rooms"
              className="whitespace-nowrap text-xs font-medium text-indigo-600"
            >
              Xem tất cả →
            </Link>
          </div>
          <QueryState query={rooms} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  {[
                    "Tin đăng / Người đăng",
                    "Khu vực",
                    "Giá thuê",
                    "Trạng thái",
                  ].map((h) => (
                    <th key={h} className="px-5 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.data?.items.slice(0, 5).map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="min-w-52 px-5 py-4">
                      <Link
                        to={`/admin/rooms?room=${encodeURIComponent(r.id)}`}
                        className="block font-medium text-slate-800 hover:text-indigo-600"
                      >
                        {r.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {r.ownerName}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {r.district}, {r.city}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs font-medium">
                      {r.monthlyRent.toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                        Chờ duyệt
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rooms.data?.totalCount === 0 && (
            <div className="p-10 text-center">
              <Building2 className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium">
                Không có tin đăng chờ duyệt
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Tin mới sẽ xuất hiện tại đây khi được gửi.
              </p>
            </div>
          )}
        </Card>
        {me?.role === "admin" && (
          <Card className="rounded-2xl border-slate-200 p-5 shadow-none">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Nhật ký gần đây</h2>
              <Link
                to="/admin/audit"
                className="text-xs font-medium text-indigo-600"
              >
                Xem tất cả
              </Link>
            </div>
            <QueryState query={audit} />
            <div className="mt-5 space-y-5">
              {audit.data?.items.slice(0, 4).map((a) => (
                <div key={a.id} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {a.actorName ?? "Tài khoản đã xóa"}
                    </p>
                    <p className="mt-1 break-words text-xs text-slate-600">
                      {a.note || a.action}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {new Date(a.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {audit.data?.totalCount === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">
                Chưa có thao tác được ghi nhận.
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
