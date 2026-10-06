import { useStaffPath } from "@/features/auth";
import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Flag,
  ShieldCheck,
  Scale,
  UsersRound,
  Store,
  Receipt,
  ScrollText,
  Shield,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/features/auth";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import { Logo } from "@/layouts/main-layout";
import { Button } from "@/components/ui/button";
import { useStaffQueueCounts } from "../hooks/use-staff-queue-counts";
const navigation = [
  { path: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { path: "/admin/users", label: "Thành viên", icon: Users },
  { path: "/admin/rooms", label: "Kiểm duyệt tin đăng", icon: Building2 },
  { path: "/admin/groups", label: "Nhóm ở ghép", icon: UsersRound },
  { path: "/admin/disputes", label: "Tranh chấp", icon: Scale },
  { path: "/admin/reports", label: "Báo cáo vi phạm", icon: Flag },
  {
    path: "/admin/verifications",
    label: "Xác minh danh tính",
    icon: ShieldCheck,
  },
  {
    path: "/admin/staff",
    label: "Đội ngũ & phân quyền",
    icon: Shield,
    admin: true,
  },
  { path: "/admin/services", label: "Dịch vụ", icon: Store, admin: true },
  {
    path: "/admin/refunds",
    label: "Yêu cầu hoàn tiền",
    icon: Receipt,
    admin: true,
  },
  {
    path: "/admin/audit",
    label: "Nhật ký xử lý",
    icon: ScrollText,
    admin: true,
  },
];
export function AdminLayout({ children }: { children: ReactNode }) {
  const staffPath = useStaffPath();
  const queueCounts = useStaffQueueCounts();
  const user = useAuthStore((s) => s.user),
    signOut = useSignOut(),
    [open, setOpen] = useState(false),
    location = useLocation();
  const items = navigation.filter((n) => !n.admin || user?.role === "admin").map((n) => ({
    ...n,
    path: staffPath + n.path.slice("/admin".length),
    count: queueCounts[n.path.split("/").at(-1) as keyof typeof queueCounts] ?? 0,
  }));
  const active = items
    .filter(
      (n) =>
        location.pathname === n.path ||
        location.pathname.startsWith(n.path + "/"),
    )
    .at(-1);
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800">
      <a href="#admin-content" className="sr-only focus:not-sr-only">
        Đến nội dung quản trị
      </a>
      {open && (
        <button
          aria-label="Đóng điều hướng"
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col border-r bg-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between px-5">
          <Logo />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Đóng menu quản trị"
            className="lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
        </div>
        <p className="shrink-0 px-6 pt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {user?.role === "admin"
            ? "Quản trị hệ thống"
            : "Không gian kiểm duyệt"}
        </p>
        <nav
          aria-label="Điều hướng quản trị"
          className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4"
        >
          {items.map((n) => (
            <NavLink
              key={n.path}
              to={n.path}
              end={n.path === staffPath}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"}`
              }
            >
              <n.icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1">{n.label}</span>
              {n.count > 0 && (
                <span
                  aria-label={`${n.count} việc chờ xử lý`}
                  className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold leading-none text-white"
                >
                  {n.count > 99 ? "99+" : n.count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 border-t bg-white p-4">
          <p className="truncate text-sm font-semibold">{user?.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {user?.role === "admin" ? "Quản trị viên" : "Kiểm duyệt viên"}
          </p>
          <Button
            variant="ghost"
            className="mt-3 w-full justify-start text-slate-500"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate(false)}
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <div className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-white px-5 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mở menu quản trị"
            className="lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">
              RoomieMatch / {user?.role === "admin" ? "Quản trị" : "Kiểm duyệt"}
            </p>
            <p className="mt-1 text-sm font-medium">
              {active?.label ?? "Tổng quan"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            {user?.role === "admin" ? "Admin" : "Moderator"}
          </span>
        </div>
        <main id="admin-content" className="mx-auto min-w-0 max-w-[1500px] p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
