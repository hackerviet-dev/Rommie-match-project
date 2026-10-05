import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth";
import { onboardingApi } from "../services/onboarding-api";

export function OnboardingStatus() {
  const userId = useAuthStore((state) => state.user?.id);
  const status = useQuery({ queryKey: ["onboarding", userId], queryFn: onboardingApi.getStatus, enabled: Boolean(userId) });
  return <div role="status" className="mt-3 rounded-xl border bg-mint/10 p-3 text-sm">
    <p className="font-medium">{status.isError ? "Chưa kiểm tra được trạng thái onboarding" : status.isPending ? "Đang kiểm tra onboarding…" : status.data.isComplete ? "Đã hoàn thành onboarding · Hồ sơ đã lưu" : "Chưa hoàn thành onboarding · Cần bổ sung thông tin"}</p>
    <p className="mt-1 text-xs text-muted-foreground">Phần trăm thể hiện mức độ đầy đủ của hồ sơ, khác với trạng thái hoàn thành 4 bước onboarding. Chỉnh sửa chưa lưu không thay đổi hồ sơ hiện tại. Bài khảo sát và xác minh danh tính có trạng thái riêng.</p>
  </div>;
}
