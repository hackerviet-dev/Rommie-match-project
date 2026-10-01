import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth";

export function AuthGuard({ children, staff = false }: { children: ReactNode; staff?: boolean }) {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  if (!isInitialized) return <div role="status" className="p-8 text-center">Đang kiểm tra phiên đăng nhập…</div>;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (staff && user?.role !== "admin" && user?.role !== "moderator") return <Navigate to="/dashboard" replace />;
  return children;
}
