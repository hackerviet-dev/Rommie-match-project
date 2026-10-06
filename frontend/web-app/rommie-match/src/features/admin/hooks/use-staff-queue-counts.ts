import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth";
import { staffApi } from "../services/staff-api";
import { adminApi } from "../services/admin-api";

export function useStaffQueueCounts() {
  const user = useAuthStore((state) => state.user);
  const overview = useQuery({
    queryKey: ["staff", "overview", user?.id],
    queryFn: staffApi.overview,
    enabled: user?.role === "admin" || user?.role === "moderator",
    refetchInterval: 30_000,
    refetchOnWindowFocus: "always",
  });
  const refunds = useQuery({
    queryKey: ["admin", "refunds", "pending-count", user?.id],
    queryFn: () => adminApi.refunds(1, "pending"),
    enabled: user?.role === "admin",
    refetchInterval: 30_000,
    refetchOnWindowFocus: "always",
  });
  // Hide counts after failed refresh rather than showing stale queue totals.
  const stats = overview.isError ? undefined : overview.data;
  return {
    rooms: stats?.pendingRooms ?? 0,
    disputes: stats?.openDisputes ?? 0,
    reports: stats?.openReports ?? 0,
    verifications: stats?.pendingVerifications ?? 0,
    refunds: refunds.isError ? 0 : (refunds.data?.totalCount ?? 0),
  };
}
