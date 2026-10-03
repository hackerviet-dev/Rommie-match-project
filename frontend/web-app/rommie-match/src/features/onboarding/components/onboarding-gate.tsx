import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { useAuthStore } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { onboardingApi } from "../services/onboarding-api";

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user, isInitialized, isAuthenticated } = useAuthStore();
  const { pathname } = useLocation();
  const isMember = isAuthenticated && Boolean(user) && user?.role !== "admin" && user?.role !== "moderator";
  const status = useQuery({ queryKey: ["onboarding", user?.id], queryFn: onboardingApi.getStatus, enabled: isInitialized && isMember, retry: false });
  if (!isInitialized || (isMember && status.isPending)) return <div role="status" className="flex min-h-screen items-center justify-center gap-3"><LoaderCircle className="h-6 w-6 animate-spin motion-reduce:animate-none" />Đang kiểm tra hồ sơ…</div>;
  if (isMember && status.isError) return <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4"><p>Không thể kiểm tra hồ sơ. Vui lòng thử lại.</p><Button onClick={() => void status.refetch()}>Thử lại</Button></div>;
  if (isMember && !status.data?.isComplete && pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  return children;
}
