import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth";
import { onboardingApi } from "../services/onboarding-api";

export function OnboardingStatus() {
  const userId = useAuthStore((state) => state.user?.id);
  const status = useQuery({ queryKey: ["onboarding", userId], queryFn: onboardingApi.getStatus, enabled: Boolean(userId) });
  return <div role="status" className="mt-3 rounded-xl border bg-mint/10 p-3 text-sm">
    <p className="font-medium">{status.isError ? "Chưa kiểm tra được trạng thái onboarding" : status.isPending ? "Đang kiểm tra onboarding…" : status.data.isComplete ? "Đã hoàn thành onboarding · Hồ sơ đã lưu" : "Chưa hoàn thành onboarding · Cần bổ sung thông tin"}</p>
    <p className="mt-1 text-xs text-muted-foreground">Hoàn thành onboarding chỉ xác nhận hồ sơ đã được lưu, không xác nhận danh tính. Thay đổi đang chỉnh sửa chỉ cập nhật sau khi bạn bấm lưu.</p>
  </div>;
}
