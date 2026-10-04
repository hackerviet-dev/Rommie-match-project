import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react-native";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/features/auth";
import { colors } from "@/theme/colors";
import { formatVnd, paymentStatus } from "../labels";
import { usePlanName } from "../hooks";
import { billingApi } from "../services/billing-api";
import { openPayment } from "./premium-screen";

export function PaymentsScreen() {
  const me = useAuthStore((state) => state.user?.id);
  const planName = usePlanName();
  const subscription = useQuery({
    queryKey: ["subscription", "me", me],
    queryFn: billingApi.subscription,
  });
  const query = useQuery({ queryKey: ["billing", "payments", me], queryFn: billingApi.payments });
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right"]}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        ListHeaderComponent={
          <View className="gap-3 pb-2">
            <StackHeader title="Gói & thanh toán" />
            {subscription.data ? (
              <Card className="gap-1">
                <Text className="text-xs text-slate-500">Gói hiện tại</Text>
                <Text className="text-lg font-bold text-navy">
                  {subscription.data.isPremium ? "Premium" : "Miễn phí"}
                </Text>
                {subscription.data.endsAt ? (
                  <Text className="text-sm text-slate-500">
                    Đến {new Date(subscription.data.endsAt).toLocaleDateString("vi-VN")}
                  </Text>
                ) : null}
              </Card>
            ) : null}
            <Text className="mt-2 text-base font-bold text-ink">Lịch sử giao dịch</Text>
            <QueryState query={query} />
          </View>
        }
        ListEmptyComponent={
          query.isSuccess ? (
            <Text className="py-8 text-center text-sm text-slate-500">Chưa có giao dịch.</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const status = paymentStatus(item.status);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Giao dịch ${planName(item.planCode)}, ${status.label}`}
              onPress={() => openPayment(item.id)}
              className="flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4"
            >
              <View className="flex-1 gap-1">
                <Text className="text-base font-bold text-ink">{planName(item.planCode)}</Text>
                <Text className="text-sm text-slate-500">
                  {formatVnd(item.amount)} · {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                </Text>
                <View className="flex-row">
                  <Badge action={status.action} size="sm">
                    <BadgeText action={status.action}>{status.label}</BadgeText>
                  </Badge>
                </View>
              </View>
              <ChevronRight color={colors.teal} size={18} />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
