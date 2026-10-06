import { useStaffPath } from "@/features/auth";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  Users,
  Building2,
  Scale,
  Flag,
  ShieldCheck,
  UsersRound,
  ArrowUpRight,
} from "lucide-react";
import { useAuthStore } from "@/features/auth";
import { AdminLayout } from "@/features/admin/components/admin-layout";
import {
  StaffUsers,
  StaffUserDetail,
} from "@/features/admin/components/staff-users";
import { RoomModeration } from "@/features/admin/components/room-moderation";
import {
  Reports,
  Verifications,
  Refunds,
} from "@/features/admin/components/review-queues";
import { ServiceManager } from "@/features/admin/components/service-manager";
import { GroupsPanel } from "@/features/workspaces/components/groups-panel";
import { DisputesPanel } from "@/features/workspaces/components/disputes-panel";
import { staffApi } from "@/features/admin/services/staff-api";
import { adminApi } from "@/features/admin/services/admin-api";
import { Card } from "@/components/ui/card";
import { QueryState, Pagination } from "@/components/common/query-state";
import { useState } from "react";
function AdminOnly({ children }: { children: ReactNode }) {
  const staffPath = useStaffPath();
  return useAuthStore((s) => s.user?.role) === "admin" ? (
    children
  ) : (
    <Navigate to={staffPath} replace />
  );
}
function Overview() {
  const staffPath = useStaffPath();
  const me = useAuthStore((s) => s.user),
    query = useQuery({
      queryKey: ["staff", "overview", me?.id],
      queryFn: staffApi.overview,
    }),
    stats = useQuery({
      queryKey: ["admin", "stats", me?.id],
      queryFn: adminApi.stats,
      enabled: me?.role === "admin",
    });
  const cards = [
    {
      label: "Tin đăng chờ duyệt",
      value: query.data?.pendingRooms,
      path: "rooms",
      icon: Building2,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Tranh chấp cần xử lý",
      value: query.data?.openDisputes,
      path: "disputes",
      icon: Scale,
      color: "text-orange-600 bg-orange-50",
    },
    {
      label: "Báo cáo đang mở",
      value: query.data?.openReports,
      path: "reports",
      icon: Flag,
      color: "text-rose-600 bg-rose-50",
    },
    {
      label: "Xác minh chờ duyệt",
      value: query.data?.pendingVerifications,
      path: "verifications",
      icon: ShieldCheck,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Tổng quan {me?.role === "admin" ? "quản trị" : "kiểm duyệt"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Theo dõi công việc cần xử lý và hoạt động của cộng đồng.
          </p>
        </div>
        <span className="rounded-full border bg-white px-3 py-2 text-xs text-slate-500">
          {new Date().toLocaleDateString("vi-VN")}
        </span>
      </div>
      <QueryState query={query} />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.path} to={`${staffPath}/${c.path}`}>
            <Card className="h-full rounded-2xl border-slate-200 p-6 shadow-none transition-shadow hover:shadow-sm">
              <div
                className={`grid h-12 w-12 place-items-center rounded-xl ${c.color}`}
              >
                <c.icon className="h-6 w-6" />
              </div>
              <p className="mt-5 text-3xl font-semibold">
                {query.isError ? "—" : (c.value ?? "…")}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 text-sm text-slate-500">
                {c.label}
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="rounded-2xl border-slate-200 p-6 shadow-none xl:col-span-2">
          <h2 className="font-semibold">Không gian cộng đồng</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Link
              to={`${staffPath}/groups`}
              className="flex items-center gap-4 rounded-xl bg-slate-50 p-5"
            >
              <UsersRound className="h-6 w-6 text-indigo-500" />
              <div>
                <p className="text-2xl font-semibold">
                  {query.data?.groups ?? "…"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Nhóm ở ghép</p>
              </div>
            </Link>
            <Link
              to={`${staffPath}/users`}
              className="flex items-center gap-4 rounded-xl bg-slate-50 p-5"
            >
              <Users className="h-6 w-6 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold">Tra cứu thành viên</p>
                <p className="mt-1 text-xs text-slate-500">
                  Hồ sơ, trạng thái và quyền
                </p>
              </div>
            </Link>
          </div>
          {me?.role === "admin" && (
            <>
              <QueryState query={stats} />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Tài khoản hoạt động", stats.data?.activeUsers],
                  ["Đăng ký trong 30 ngày", stats.data?.newUsersLast30Days],
                  ["Hồ sơ đã xác minh", stats.data?.verifiedProfiles],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border p-4">
                    <p className="text-xl font-semibold">{value ?? "…"}</p>
                    <p className="mt-2 text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
        <Card className="rounded-2xl border-slate-200 p-6 shadow-none">
          <h2 className="font-semibold">Quy trình xử lý</h2>
          <ol className="mt-5 space-y-5 text-sm text-slate-600">
            <li>
              <span className="mr-2 rounded-full bg-indigo-50 px-2 py-1 text-indigo-600">
                1
              </span>
              Đọc hồ sơ và nội dung liên quan
            </li>
            <li>
              <span className="mr-2 rounded-full bg-indigo-50 px-2 py-1 text-indigo-600">
                2
              </span>
              Thu thập phản hồi, kiểm tra căn cứ
            </li>
            <li>
              <span className="mr-2 rounded-full bg-indigo-50 px-2 py-1 text-indigo-600">
                3
              </span>
              Ghi rõ lý do và kết quả xử lý
            </li>
          </ol>
          <p className="mt-6 border-t pt-4 text-xs leading-relaxed text-slate-500">
            Quyền nhóm ở ghép chỉ có hiệu lực trong nhóm. Premium không cấp
            quyền quản trị hệ thống.
          </p>
        </Card>
      </div>
    </div>
  );
}
function AuditLog() {
  const [page, setPage] = useState(1),
    me = useAuthStore((s) => s.user?.id),
    query = useQuery({
      queryKey: ["staff", "audit", me, page],
      queryFn: () => staffApi.audit(page),
    });
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Nhật ký xử lý</h1>
      <p className="mt-2 text-sm text-slate-500">
        Ghi nhận người thực hiện, đối tượng và lý do thay đổi.
      </p>
      <QueryState query={query} />
      <Card className="mt-6 overflow-x-auto rounded-2xl border-slate-200 p-0 shadow-none">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              {["Thời điểm", "Người thực hiện", "Thao tác", "Ghi chú"].map(
                (h) => (
                  <th key={h} className="p-4">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {query.data?.items.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="whitespace-nowrap p-4 text-xs">
                  {new Date(a.created_at).toLocaleString("vi-VN")}
                </td>
                <td className="p-4">{a.actorName ?? "Tài khoản đã xóa"}</td>
                <td className="p-4">
                  <p>{a.action}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {a.targetId}
                  </p>
                </td>
                <td className="min-w-64 p-4">{a.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.data?.totalCount === 0 && (
          <p className="p-8 text-center text-slate-500">
            Chưa có thao tác được ghi nhận.
          </p>
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
function Queue({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-display font-bold">{title}</h1>
      {children}
    </div>
  );
}
export default function AdminPage() {
  const staffPath = useStaffPath();
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="users" element={<StaffUsers />} />
        <Route path="users/:id" element={<StaffUserDetail />} />
        <Route
          path="staff"
          element={
            <AdminOnly>
              <StaffUsers team />
            </AdminOnly>
          }
        />
        <Route path="rooms" element={<RoomModeration />} />
        <Route path="groups" element={<GroupsPanel staff />} />
        <Route path="disputes" element={<DisputesPanel staff />} />
        <Route
          path="reports"
          element={
            <Queue title="Báo cáo vi phạm">
              <Reports />
            </Queue>
          }
        />
        <Route
          path="verifications"
          element={
            <Queue title="Xác minh danh tính">
              <Verifications />
            </Queue>
          }
        />
        <Route
          path="services"
          element={
            <AdminOnly>
              <Queue title="Quản lý dịch vụ">
                <ServiceManager />
              </Queue>
            </AdminOnly>
          }
        />
        <Route
          path="refunds"
          element={
            <AdminOnly>
              <Queue title="Yêu cầu hoàn tiền">
                <Refunds />
              </Queue>
            </AdminOnly>
          }
        />
        <Route
          path="audit"
          element={
            <AdminOnly>
              <AuditLog />
            </AdminOnly>
          }
        />
        <Route path="*" element={<Navigate to={staffPath} replace />} />
      </Routes>
    </AdminLayout>
  );
}
