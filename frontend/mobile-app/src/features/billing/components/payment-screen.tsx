import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { FormScreen } from "@/components/form-screen";
import { QueryState } from "@/components/query-state";
import { StackHeader, goToTab } from "@/components/stack-header";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth";
import { colors } from "@/theme/colors";
import { canRequestRefund, formatVnd, paymentStatus, refundStatusLabel } from "../labels";
import { usePlanName } from "../hooks";
import { billingApi } from "../services/billing-api";

// Gộp PremiumResultPage và PaymentDetailPage của web: đang chờ thì tự kiểm tra lại mỗi
// 2 giây; thanh toán xong thì làm mới gói thành viên.
export function PaymentScreen({ id }: { id: string }) {
  const me = useAuthStore((state) => state.user?.id);
  const planName = usePlanName();
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: ["billing", "payment", me, id],
    queryFn: () => billingApi.payment(id),
    enabled: Boolean(id),
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 2000 : false),
  });
  const refund = useMutation({
    mutationFn: () => billingApi.refund(id, reason.trim() || undefined),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["billing"] });
      void client.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
  const payment = query.data;
  const status = payment?.status;
  useEffect(() => {
    if (status === "paid" || status === "refunded") {
      void client.invalidateQueries({ queryKey: ["subscription"] });
      void client.invalidateQueries({ queryKey: ["matching", "usage"] });
    }
  }, [status, client]);

  const banner =
    status === "paid"
      ? {
          icon: <CheckCircle2 color={colors.teal} size={40} />,
          title: "Thanh toán thành công",
          text: "Gói Premium đã được kích hoạt.",
        }
      : status === "refunded"
        ? {
            icon: <CheckCircle2 color="#0284c7" size={40} />,
            title: "Đã hoàn tiền",
            text: "Giao dịch đã được hoàn tiền và gói Premium từ giao dịch này đã kết thúc.",
          }
        : status === "pending"
          ? {
              icon: <Clock color="#d97706" size={40} />,
              title: "Đang chờ xác nhận",
              text: "Hoàn tất thanh toán trên trang payOS rồi quay lại đây. Màn hình tự cập nhật.",
            }
          : status
            ? {
                icon: <XCircle color="#dc2626" size={40} />,
                title: "Chưa thanh toán",
                text: "Đơn chưa được thanh toán. Bạn có thể thử lại từ trang Premium.",
              }
            : null;
  const badge = payment ? paymentStatus(payment.status) : null;

  return (
    <FormScreen>
      <StackHeader title="Giao dịch" />
      <QueryState query={query} loadingText="Đang kiểm tra trạng thái thanh toán…" />
      {payment && banner && badge ? (
        <View className="mt-4 gap-4">
          <Card className="items-center gap-2 p-6">
            {banner.icon}
            <Text className="mt-1 text-xl font-bold text-ink">{banner.title}</Text>
            <Text className="text-center text-sm leading-5 text-slate-500">{banner.text}</Text>
            {status === "pending" ? <ActivityIndicator color={colors.teal} /> : null}
          </Card>
          <Card className="gap-3">
            {(
              [
                ["Gói", planName(payment.planCode)],
                ["Số tiền", formatVnd(payment.amount)],
                ["Tạo lúc", new Date(payment.createdAt).toLocaleString("vi-VN")],
                ...(payment.paidAt
                  ? ([
                      ["Thanh toán lúc", new Date(payment.paidAt).toLocaleString("vi-VN")],
                    ] as const)
                  : []),
                ["Mã giao dịch", payment.id],
              ] as const
            ).map(([label, value]) => (
              <View key={label}>
                <Text className="text-xs text-slate-500">{label}</Text>
                <Text className="text-base text-ink" selectable>
                  {value}
                </Text>
              </View>
            ))}
            <View className="flex-row">
              <Badge action={badge.action} size="sm">
                <BadgeText action={badge.action}>{badge.label}</BadgeText>
              </Badge>
            </View>
          </Card>
          {payment.refundRequest ? (
            <Card className="gap-1 bg-slate-50">
              <Text className="text-sm font-semibold text-ink">
                Hoàn tiền: {refundStatusLabel(payment.refundRequest.status)}
              </Text>
              {payment.refundRequest.resolutionNote ? (
                <Text className="text-sm text-slate-600">
                  {payment.refundRequest.resolutionNote}
                </Text>
              ) : null}
            </Card>
          ) : null}
          {canRequestRefund(payment) ? (
            <Card className="gap-3">
              <Text className="text-base font-bold text-ink">Yêu cầu hoàn tiền</Text>
              <Text className="text-sm leading-5 text-slate-500">
                Giao dịch payOS được hoàn bằng chuyển khoản thủ công sau khi quản trị xử lý yêu cầu.
                Hạn chót: {new Date(payment.refundableUntil ?? "").toLocaleDateString("vi-VN")}.
              </Text>
              <Input
                value={reason}
                onChangeText={setReason}
                accessibilityLabel="Lý do hoàn tiền"
                multiline
                maxLength={1000}
                textAlignVertical="top"
                className="h-20 py-3"
                placeholder="Lý do (tuỳ chọn)"
              />
              <Button
                action="primary"
                variant="outline"
                loading={refund.isPending}
                onPress={() => refund.mutate()}
              >
                <ButtonText>Gửi yêu cầu hoàn tiền</ButtonText>
              </Button>
              <FormError message={refund.error?.message} />
            </Card>
          ) : null}
          {refund.isSuccess ? (
            <Text className="text-center text-sm text-teal">
              Đã gửi yêu cầu. Xem trạng thái hoàn tiền phía trên.
            </Text>
          ) : null}
          <Button action="primary" className="h-12" onPress={() => goToTab("/premium")}>
            <ButtonText>Về trang Premium</ButtonText>
          </Button>
        </View>
      ) : null}
    </FormScreen>
  );
}
