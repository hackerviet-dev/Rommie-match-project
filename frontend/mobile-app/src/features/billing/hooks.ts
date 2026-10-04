import { useQuery } from "@tanstack/react-query";
import { billingApi } from "./services/billing-api";

// Tên gói theo mã (premium_monthly -> "Premium tháng"); chưa tải xong thì dùng mã.
export function usePlanName() {
  const plans = useQuery({ queryKey: ["billing", "plans"], queryFn: billingApi.plans });
  return (code: string) => plans.data?.find((plan) => plan.code === code)?.name ?? code;
}
