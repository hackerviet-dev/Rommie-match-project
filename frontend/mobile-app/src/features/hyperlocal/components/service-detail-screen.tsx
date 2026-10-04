import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { MapPin, Phone, ShieldCheck, Star } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, Linking, Text, View } from "react-native";
import { z } from "zod";
import { FormScreen } from "@/components/form-screen";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateField, TimeField } from "@/components/ui/date-field";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PendingHint } from "@/components/ui/pending-hint";
import { colors } from "@/theme/colors";
import { vietnamToday } from "@/utils/date-rules";
import { categoryIcon } from "../categories";
import { bookingSchema } from "../schemas/booking-schema";
import { bookingsApi } from "../services/bookings-api";
import { hyperlocalApi } from "../services/hyperlocal-api";

// Web dùng một ô datetime-local; trên điện thoại tách ngày và giờ thành hai bộ chọn rồi ghép
// lại "YYYY-MM-DDTHH:mm" (giờ địa phương) trước khi kiểm tra bằng cùng bookingSchema.
const formSchema = z
  .object({
    date: z.string().min(1, "Chọn ngày hẹn."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Chọn giờ hẹn."),
    address: bookingSchema.shape.address,
    contactPhone: bookingSchema.shape.contactPhone,
    note: bookingSchema.shape.note,
  })
  .superRefine((value, ctx) => {
    if (!value.date || !/^\d{2}:\d{2}$/.test(value.time)) return;
    const check = bookingSchema.shape.scheduledAt.safeParse(`${value.date}T${value.time}`);
    if (!check.success)
      ctx.addIssue({ code: "custom", path: ["time"], message: check.error.issues[0].message });
  });
type BookingForm = z.infer<typeof formSchema>;

export function ServiceDetailScreen({ id }: { id: string }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["services", "detail", id],
    queryFn: () => hyperlocalApi.get(id),
    enabled: Boolean(id),
  });
  const form = useForm<BookingForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { date: "", time: "", address: "", contactPhone: "", note: "" },
  });
  const save = useMutation({
    mutationFn: ({ date, time, ...rest }: BookingForm) =>
      bookingsApi.create(id, { ...rest, scheduledAt: new Date(`${date}T${time}`).toISOString() }),
    onSuccess: (booking) => {
      void client.invalidateQueries({ queryKey: ["bookings"] });
      router.replace({ pathname: "/bookings/[id]", params: { id: booking.id } });
    },
  });
  const errors = form.formState.errors;
  const service = query.isError ? undefined : query.data;
  const Icon = categoryIcon(service?.category ?? "");
  const submit = form.handleSubmit((values) => {
    Keyboard.dismiss();
    save.mutate(values);
  });

  return (
    <FormScreen>
      <StackHeader title="Dịch vụ" />
      <QueryState query={query} />
      {service ? (
        <View className="mt-4 gap-4">
          <Card className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-mint/30">
                <Icon color={colors.navy} size={22} />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-teal">{service.category}</Text>
                <Text className="text-xl font-bold text-ink">{service.name}</Text>
              </View>
            </View>
            {service.description ? (
              <Text className="text-sm leading-6 text-slate-600">{service.description}</Text>
            ) : null}
            <View className="flex-row items-center gap-1.5">
              <MapPin color={colors.slate500} size={14} />
              <Text className="text-sm text-slate-500">
                {service.district}, {service.city}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Star color="#d97706" fill="#d97706" size={14} />
              <Text className="text-sm text-amber-700">
                {service.rating}/5 · {service.reviewCount} đánh giá
              </Text>
              {service.isVerified ? (
                <>
                  <ShieldCheck color={colors.teal} size={14} />
                  <Text className="text-sm text-teal">Đã xác minh</Text>
                </>
              ) : null}
            </View>
            <Text className="text-lg font-bold text-ink">
              Từ {service.priceFrom.toLocaleString("vi-VN")}₫
            </Text>
            {service.phone ? (
              <Button
                action="primary"
                variant="outline"
                className="h-11"
                onPress={() => void Linking.openURL(`tel:${service.phone}`)}
              >
                <ButtonIcon as={Phone} />
                <ButtonText>Gọi {service.phone}</ButtonText>
              </Button>
            ) : null}
          </Card>

          <Card className="gap-4">
            <Text className="text-lg font-bold text-ink">Đặt lịch dịch vụ</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label="Ngày hẹn" required error={errors.date?.message}>
                  <Controller
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <DateField
                        value={field.value}
                        onChange={field.onChange}
                        minimumDate={vietnamToday()}
                        invalid={Boolean(errors.date)}
                      />
                    )}
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Giờ hẹn" required>
                  <Controller
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <TimeField
                        value={field.value}
                        onChange={field.onChange}
                        invalid={Boolean(errors.time)}
                      />
                    )}
                  />
                </FormField>
              </View>
            </View>
            {errors.time ? (
              <Text className="-mt-2 text-sm text-red-600">{errors.time.message}</Text>
            ) : null}
            <FormField label="Địa chỉ" required error={errors.address?.message}>
              <Controller
                control={form.control}
                name="address"
                render={({ field }) => (
                  <Input
                    value={field.value}
                    onChangeText={field.onChange}
                    accessibilityLabel="Địa chỉ"
                    invalid={Boolean(errors.address)}
                    autoComplete="street-address"
                    placeholder="Số nhà, đường, quận"
                  />
                )}
              />
            </FormField>
            <FormField label="Số điện thoại" required error={errors.contactPhone?.message}>
              <Controller
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <Input
                    value={field.value}
                    onChangeText={field.onChange}
                    accessibilityLabel="Số điện thoại"
                    invalid={Boolean(errors.contactPhone)}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    placeholder="0901 234 567"
                  />
                )}
              />
            </FormField>
            <FormField label="Ghi chú (tuỳ chọn)" error={errors.note?.message}>
              <Controller
                control={form.control}
                name="note"
                render={({ field }) => (
                  <Input
                    value={field.value}
                    onChangeText={field.onChange}
                    accessibilityLabel="Ghi chú"
                    multiline
                    maxLength={1000}
                    textAlignVertical="top"
                    className="h-24 py-3"
                    placeholder="VD: gọi trước 15 phút"
                  />
                )}
              />
            </FormField>
            <Text className="text-xs text-slate-500">
              Lịch hẹn từ 30 phút đến 60 ngày kể từ hiện tại.
            </Text>
            <FormError message={save.error?.message} />
            <Button action="secondary" className="h-12" loading={save.isPending} onPress={submit}>
              <ButtonText>{save.isPending ? "Đang đặt…" : "Xác nhận đặt lịch"}</ButtonText>
            </Button>
            <PendingHint active={save.isPending} />
          </Card>
        </View>
      ) : null}
    </FormScreen>
  );
}
