import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, Switch, Text, View } from "react-native";
import { Button, ButtonText } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { DateField } from "@/components/ui/date-field";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PendingHint } from "@/components/ui/pending-hint";
import { colors } from "@/theme/colors";
import { vietnamToday } from "@/utils/date-rules";
import { PROPERTY_TYPES } from "../room-labels";
import { type RoomFormValues, roomSchema } from "../schemas/room-schema";
import { roomsApi } from "../services/rooms-api";
import type { Room } from "../types/room-types";

type TextKey = Exclude<keyof RoomFormValues, "isActive" | "propertyType" | "availableFrom">;
const FIELDS: {
  key: TextKey;
  label: string;
  required?: boolean;
  numeric?: "int" | "decimal";
  placeholder?: string;
}[] = [
  {
    key: "title",
    label: "Tiêu đề",
    required: true,
    placeholder: "VD: Phòng 25m² gần ĐH Bách khoa",
  },
  { key: "address", label: "Địa chỉ", required: true, placeholder: "Số nhà, đường" },
  { key: "city", label: "Thành phố", required: true, placeholder: "VD: TP.HCM" },
  { key: "district", label: "Quận / khu vực", required: true, placeholder: "VD: Quận 10" },
  { key: "monthlyRent", label: "Tiền thuê mỗi tháng (VND)", required: true, numeric: "int" },
  { key: "deposit", label: "Tiền cọc (VND)", numeric: "int" },
  { key: "maxOccupants", label: "Số người tối đa (gồm bạn)", required: true, numeric: "int" },
  { key: "roommatesNeeded", label: "Số người cần thêm", numeric: "int" },
  { key: "bedrooms", label: "Số phòng ngủ", numeric: "int" },
  { key: "areaM2", label: "Diện tích (m²)", numeric: "decimal" },
  {
    key: "amenities",
    label: "Tiện ích (cách nhau bằng dấu phẩy)",
    placeholder: "Máy lạnh, Wi-Fi, Ban công",
  },
];

// Bản mobile của RoomEditor trên web: cùng schema, cùng payload POST/PUT /api/rooms.
export function RoomEditor({ room }: { room?: Room }) {
  const client = useQueryClient();
  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      title: room?.title ?? "",
      address: room?.address ?? "",
      city: room?.city ?? "",
      district: room?.district ?? "",
      description: room?.description ?? "",
      monthlyRent: room?.monthlyRent ?? 0,
      deposit: room?.deposit ?? 0,
      maxOccupants: room?.maxOccupants ?? 2,
      availableFrom: room?.availableFrom ?? vietnamToday(),
      propertyType: (room?.propertyType ?? "") as RoomFormValues["propertyType"],
      bedrooms: room?.bedrooms?.toString() ?? "",
      areaM2: room?.areaM2?.toString() ?? "",
      roommatesNeeded: room?.roommatesNeeded?.toString() ?? "",
      latitude: room?.latitude?.toString() ?? "",
      longitude: room?.longitude?.toString() ?? "",
      amenities: room?.amenities.join(", ") ?? "",
      isActive: room?.isActive ?? true,
    },
  });
  const save = useMutation({
    mutationFn: (values: RoomFormValues) => {
      const body = {
        ...values,
        propertyType: values.propertyType || null,
        bedrooms: values.bedrooms ? Number(values.bedrooms) : null,
        areaM2: values.areaM2 ? Number(values.areaM2) : null,
        roommatesNeeded: values.roommatesNeeded ? Number(values.roommatesNeeded) : null,
        latitude: values.latitude ? Number(values.latitude) : null,
        longitude: values.longitude ? Number(values.longitude) : null,
        amenities: values.amenities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };
      return room ? roomsApi.update(room.id, body) : roomsApi.create(body);
    },
    onSuccess: async (saved) => {
      await client.invalidateQueries({ queryKey: ["rooms"] });
      router.replace({ pathname: "/rooms/[id]", params: { id: saved.id } });
    },
  });
  const errors = form.formState.errors;
  const submit = form.handleSubmit((values) => {
    Keyboard.dismiss();
    save.mutate(values);
  });

  return (
    <View className="gap-4">
      {FIELDS.map(({ key, label, required, numeric, placeholder }) => (
        <FormField key={key} label={label} required={required} error={errors[key]?.message}>
          <Controller
            control={form.control}
            name={key}
            render={({ field }) => (
              <Input
                value={field.value === undefined || field.value === null ? "" : String(field.value)}
                onChangeText={(value) =>
                  field.onChange(
                    numeric === "int"
                      ? value.replace(/\D/g, "")
                      : numeric === "decimal"
                        ? value.replace(",", ".").replace(/[^\d.]/g, "")
                        : value,
                  )
                }
                onBlur={field.onBlur}
                accessibilityLabel={label}
                invalid={Boolean(errors[key])}
                keyboardType={
                  numeric === "int"
                    ? "number-pad"
                    : numeric === "decimal"
                      ? "decimal-pad"
                      : "default"
                }
                placeholder={placeholder}
              />
            )}
          />
        </FormField>
      ))}
      <FormField label="Ngày có thể dọn vào" required error={errors.availableFrom?.message}>
        <Controller
          control={form.control}
          name="availableFrom"
          render={({ field }) => (
            <DateField
              value={field.value}
              onChange={field.onChange}
              minimumDate={vietnamToday()}
              invalid={Boolean(errors.availableFrom)}
            />
          )}
        />
      </FormField>
      <FormField label="Loại nhà">
        <Controller
          control={form.control}
          name="propertyType"
          render={({ field }) => (
            <ChoiceChips options={PROPERTY_TYPES} value={field.value} onChange={field.onChange} />
          )}
        />
      </FormField>
      <FormField label="Mô tả phòng" error={errors.description?.message}>
        <Controller
          control={form.control}
          name="description"
          render={({ field }) => (
            <Input
              value={field.value}
              onChangeText={field.onChange}
              multiline
              maxLength={4000}
              textAlignVertical="top"
              className="h-32 py-3"
              placeholder="Phòng thoáng, gần chợ, giờ giấc tự do…"
            />
          )}
        />
      </FormField>
      <View className="flex-row gap-3">
        {(["latitude", "longitude"] as const).map((key) => (
          <View key={key} className="flex-1">
            <FormField
              label={key === "latitude" ? "Vĩ độ" : "Kinh độ"}
              error={errors[key]?.message}
            >
              <Controller
                control={form.control}
                name={key}
                render={({ field }) => (
                  <Input
                    value={field.value}
                    onChangeText={(value) => field.onChange(value.replace(",", "."))}
                    keyboardType="numbers-and-punctuation"
                    placeholder={key === "latitude" ? "10.77" : "106.69"}
                  />
                )}
              />
            </FormField>
          </View>
        ))}
      </View>
      <Text className="-mt-2 text-xs text-slate-500">
        Tuỳ chọn: lấy toạ độ từ Google Maps để ghim đúng vị trí.
      </Text>
      <Controller
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <View className="flex-row items-center justify-between rounded-2xl bg-white p-4">
            <View className="flex-1">
              <Text className="text-base font-semibold text-ink">Hiển thị tin phòng</Text>
              <Text className="text-xs text-slate-500">Tắt để tạm ẩn, không cần xoá.</Text>
            </View>
            <Switch
              accessibilityLabel="Hiển thị tin phòng"
              value={field.value}
              onValueChange={field.onChange}
              trackColor={{ true: colors.teal, false: "#cbd5e1" }}
            />
          </View>
        )}
      />
      {Object.keys(errors).length ? (
        <FormError message="Vui lòng kiểm tra các mục được đánh dấu đỏ phía trên." />
      ) : null}
      <FormError message={save.error?.message} />
      <Button action="primary" className="h-12" loading={save.isPending} onPress={submit}>
        <ButtonText>
          {save.isPending ? "Đang lưu…" : room ? "Lưu thay đổi" : "Đăng phòng"}
        </ButtonText>
      </Button>
      <PendingHint active={save.isPending} />
    </View>
  );
}
