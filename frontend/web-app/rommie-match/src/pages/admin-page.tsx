import { Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
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
import { AdminOverview } from "@/features/admin/components/admin-overview";
import { Card } from "@/components/ui/card";
import { QueryState, Pagination } from "@/components/common/query-state";
import { useState } from "react";
function AdminOnly({ children }: { children: ReactNode }) {
  return useAuthStore((s) => s.user?.role) === "admin" ? (
    children
  ) : (
    <Navigate to="/admin" replace />
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
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminOverview />} />
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
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}
