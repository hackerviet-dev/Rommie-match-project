import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Check, Receipt, ShieldCheck, Sparkles } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { QueryState } from "@/components/query-state";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-field";
import { useAuthStore } from "@/features/auth";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";
import { formatVnd } from "../labels";
import { billingApi } from "../services/billing-api";
import { goToTab } from "@/components/stack-header";

export const openPayment = (id: string) =>
  router.push({ pathname: "/payments/[id]", params: { id } });

export function PremiumScreen() {
  const me = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const plans = useQuery({ queryKey: ["billing", "plans"], queryFn: billingApi.plans });
  const health = useQuery({
    queryKey: ["billing", "health"],
    queryFn: billingApi.health,
    retry: false,
  });
  const subscription = useQuery({
    queryKey: ["subscription", "me", me],
    queryFn: billingApi.subscription,
  });
  // Web chuyển cả trang sang payOS rồi quay về /premium/result. Trên app: mở trang thanh
  // toán trong trình duyệt trong app, đồng thời mở màn giao dịch; màn đó tự kiểm tra trạng
  // thái theo paymentId nên không cần payOS chuyển hướng về app.
  const buy = useMutation({
    mutationFn: billingApi.checkout,
    onSuccess: (checkout) => {
      openPayment(checkout.paymentId);
      void WebBrowser.openBrowserAsync(checkout.paymentUrl, {
        controlsColor: colors.navy,
        toolbarColor: "#ffffff",
      }).finally(() => {
        void client.invalidateQueries({ queryKey: ["billing"] });
        void client.invalidateQueries({ queryKey: ["subscription"] });
      });
    },
  });
  const ready = health.data?.provider === "payos" || health.data?.provider === "mock";
  const current = subscription.data;

  return (
    <View className="gap-4">
      <Card className="items-center gap-2 border-0 bg-navy px-5 py-6">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-mint/20">
          <Sparkles color={colors.mint} size={24} />
        </View>
        <Text className="mt-2 text-center text-3xl font-bold text-white">Ghép thông minh.</Text>
        <Text className="text-center text-2xl font-bold text-mint">Dọn vào nhanh.</Text>
        <Text className="mt-1 text-center text-sm text-slate-200">
          Chọn gói với quyền lợi và mức giá hiện tại.
        </Text>
        {current ? (
          <View className="mt-3 rounded-full bg-white/15 px-4 py-2">
            <Text className="text-sm font-semibold text-white">
              Gói của bạn: {current.isPremium ? "Premium" : "Miễn phí"}
              {current.endsAt
                ? ` · đến ${new Date(current.endsAt).toLocaleDateString("vi-VN")}`
                : ""}
            </Text>
          </View>
        ) : null}
      </Card>

      <QueryState query={plans} loadingText="Đang tải các gói…" />
      <QueryState query={subscription} />
      {plans.data?.map((plan) => {
        const featured = plan.tier === "premium" && plan.durationMonths === 1;
        const isCurrent = current?.tier === plan.tier && (plan.price === 0 || current?.isPremium);
        const paying = buy.isPending && buy.variables === plan.code;
        return (
          <Card key={plan.code} className={cn("gap-3", featured && "border-2 border-teal")}>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-ink">{plan.name}</Text>
              {featured ? (
                <View className="rounded-full bg-teal px-2.5 py-1">
                  <Text className="text-[11px] font-bold text-white">Phổ biến</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-3xl font-bold text-navy">{formatVnd(plan.price)}</Text>
            <Text className="text-sm text-slate-500">
              {plan.durationMonths
                ? `${plan.durationMonths} tháng · Thanh toán một lần`
                : "Miễn phí"}
            </Text>
            <View className="gap-2.5">
              {plan.features.map((feature) => (
                <View key={feature} className="flex-row items-start gap-2">
                  <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-mint/30">
                    <Check color={colors.navy} size={12} />
                  </View>
                  <Text className="flex-1 text-sm text-ink">{feature}</Text>
                </View>
              ))}
            </View>
            {plan.price > 0 ? (
              <Button
                action={featured ? "secondary" : "primary"}
                className="mt-1 h-12"
                disabled={!ready || (buy.isPending && !paying)}
                loading={paying}
                onPress={() => buy.mutate(plan.code)}
              >
                <ButtonText>{paying ? "Đang tạo giao dịch…" : "Chọn gói"}</ButtonText>
              </Button>
            ) : (
              <Button
                action="primary"
                variant="outline"
                className="mt-1 h-12"
                onPress={() => goToTab("/matches")}
              >
                <ButtonText>
                  {isCurrent ? "Đang dùng · Khám phá ở ghép" : "Khám phá ở ghép"}
                </ButtonText>
              </Button>
            )}
          </Card>
        );
      })}

      <FormError message={buy.error?.message} />
      {health.data && !ready ? (
        <Text className="text-center text-sm text-slate-500">
          Cổng thanh toán chưa sẵn sàng trên máy chủ này.
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/payments")}
        className="flex-row items-center justify-center gap-2 py-2"
      >
        <Receipt color={colors.teal} size={16} />
        <Text className="text-sm font-semibold text-teal">Lịch sử giao dịch</Text>
      </Pressable>
      <View className="flex-row items-center justify-center gap-2">
        <ShieldCheck color={colors.teal} size={16} />
        <Text className="text-xs text-slate-500">
          Thanh toán qua payOS · Gói cập nhật sau khi hệ thống xác nhận
        </Text>
      </View>
    </View>
  );
}
