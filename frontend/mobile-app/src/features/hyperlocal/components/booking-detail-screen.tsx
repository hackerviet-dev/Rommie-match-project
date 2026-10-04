import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone } from "lucide-react-native";
import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { FormScreen } from "@/components/form-screen";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-field";
import { useAuthStore } from "@/features/auth";
import { bookingsApi } from "../services/bookings-api";
import { bookingStatusLabel, formatBookingTime } from "../utils/booking-status";
import { bookingStatusAction } from "./booking-status-badge";

export function BookingDetailScreen({ id }: { id: string }) {
  const me = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const query = useQuery({
    queryKey: ["bookings", "detail", me, id],
    queryFn: () => bookingsApi.get(id),
    enabled: Boolean(id),
  });
  const cancel = useMutation({
    mutationFn: () => bookingsApi.cancel(id),
    onSuccess: () => {
      setConfirmOpen(false);
      void client.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
  const booking = query.data;
  const cancellable =
    booking && booking.status !== "cancelled" && new Date(booking.scheduledAt) > new Date();

  return (
    <FormScreen>
      <StackHeader title="Lịch đặt dịch vụ" />
      <QueryState query={query} />
      {booking ? (
        <Card className="mt-4 gap-4">
          <View className="gap-2">
            <Text className="text-xs font-semibold text-teal">{booking.serviceCategory}</Text>
            <Text className="text-2xl font-bold text-ink">{booking.serviceName}</Text>
            <View className="flex-row">
              <Badge action={bookingStatusAction(booking.status)} size="sm">
                <BadgeText action={bookingStatusAction(booking.status)}>
                  {bookingStatusLabel(booking.status)}
                </BadgeText>
              </Badge>
            </View>
          </View>
          {(
            [
              ["Thời gian hẹn", formatBookingTime(booking.scheduledAt)],
              ["Địa chỉ", booking.address],
              ["Điện thoại", booking.contactPhone],
              ["Ghi chú", booking.note || "Không có"],
            ] as const
          ).map(([label, value]) => (
            <View key={label}>
              <Text className="text-xs text-slate-500">{label}</Text>
              <Text className="mt-0.5 text-base text-ink">{value}</Text>
            </View>
          ))}
          {booking.servicePhone ? (
            <Button
              action="primary"
              variant="outline"
              className="h-11"
              onPress={() => void Linking.openURL(`tel:${booking.servicePhone}`)}
            >
              <ButtonIcon as={Phone} />
              <ButtonText>Gọi nhà cung cấp</ButtonText>
            </Button>
          ) : null}
          {cancellable ? (
            <Button
              action="muted"
              variant="outline"
              className="h-11 border-red-300"
              onPress={() => setConfirmOpen(true)}
            >
              <ButtonText className="text-red-600">Huỷ lịch đặt</ButtonText>
            </Button>
          ) : null}
        </Card>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        title="Huỷ lịch đặt?"
        description="Nhà cung cấp sẽ nhận được thông báo huỷ. Bạn có thể đặt lại sau."
        confirmLabel="Huỷ lịch"
        destructive
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate()}
        onClose={() => setConfirmOpen(false)}
      >
        <FormError message={cancel.error?.message} />
      </ConfirmDialog>
    </FormScreen>
  );
}
