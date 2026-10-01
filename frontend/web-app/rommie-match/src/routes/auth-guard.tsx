import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth";
import { LoaderCircle } from "lucide-react";

export function AuthGuard({ children, staff = false }: { children: ReactNode; staff?: boolean }) {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  if (!isInitialized) return <div role="status" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground"><LoaderCircle aria-hidden="true" className="h-7 w-7 animate-spin text-teal motion-reduce:animate-none" />Đang kiểm tra phiên đăng nhập…</div>;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (staff && user?.role !== "admin" && user?.role !== "moderator") return <Navigate to="/dashboard" replace />;
  return children;
}
