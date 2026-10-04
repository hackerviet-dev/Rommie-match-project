import { NotificationCenter } from "@/features/notifications";
import { AppShell } from "@/layouts/main-layout";
import { AdminLayout } from "@/features/admin/components/admin-layout";
import { useAuthStore } from "@/features/auth";
export default function NotificationsPage() {
  const role = useAuthStore(s => s.user?.role);
  return role === "admin" || role === "moderator" ? <AdminLayout><NotificationCenter /></AdminLayout> : <AppShell><NotificationCenter /></AppShell>;
}
