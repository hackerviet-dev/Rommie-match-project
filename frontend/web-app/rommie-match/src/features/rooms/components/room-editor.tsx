import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { roomSchema, type RoomFormValues } from "../schemas/room-schema";
import { roomsApi } from "../services/rooms-api";
import type { Room } from "../types/room-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { vietnamToday } from "@/utils/date-rules";
export function RoomEditor({ room }: { room?: Room }) {
  const navigate = useNavigate(),
    client = useQueryClient(),
    form = useForm<RoomFormValues>({
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
        propertyType: (room?.propertyType ??
          "") as RoomFormValues["propertyType"],
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
    mutationFn: (v: RoomFormValues) => {
      const body = {
        ...v,
        propertyType: v.propertyType || null,
        bedrooms: v.bedrooms ? Number(v.bedrooms) : null,
        areaM2: v.areaM2 ? Number(v.areaM2) : null,
        roommatesNeeded: v.roommatesNeeded ? Number(v.roommatesNeeded) : null,
        latitude: v.latitude ? Number(v.latitude) : null,
        longitude: v.longitude ? Number(v.longitude) : null,
        amenities: v.amenities
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      };
      return room ? roomsApi.update(room.id, body) : roomsApi.create(body);
    },
    onSuccess: async (r) => {
      await client.invalidateQueries({ queryKey: ["rooms"] });
      navigate(`/rooms/${r.id}`);
    },
  });
  const fields: [keyof RoomFormValues, string, string][] = [
    ["title", "Tiêu đề *", "text"],
    ["address", "Địa chỉ *", "text"],
    ["city", "Thành phố *", "text"],
    ["district", "Quận / khu vực *", "text"],
    ["monthlyRent", "Tiền thuê mỗi tháng (VND) *", "number"],
    ["deposit", "Tiền cọc (VND)", "number"],
    ["maxOccupants", "Số người tối đa (bao gồm bạn) *", "number"],
    ["roommatesNeeded", "Số người cần thêm", "number"],
    ["bedrooms", "Số phòng ngủ", "number"],
    ["areaM2", "Diện tích (m²)", "number"],
    ["availableFrom", "Ngày có thể dọn vào *", "date"],
    ["latitude", "Vĩ độ", "number"],
    ["longitude", "Kinh độ", "number"],
    ["amenities", "Tiện ích (cách nhau bằng dấu phẩy)", "text"],
  ];
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
      className="grid gap-5 sm:grid-cols-2"
    >
      {fields.map(([key, label, type]) => (
        <div key={key}>
          <Label htmlFor={key}>{label}</Label>
          <Input
            id={key}
            type={type}
            step={type === "number" ? "any" : undefined}
            min={type === "date" ? vietnamToday() : undefined}
            {...form.register(key)}
            aria-invalid={Boolean(form.formState.errors[key])}
            className="mt-2"
          />
          {form.formState.errors[key] && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {form.formState.errors[key]?.message}
            </p>
          )}
        </div>
      ))}
      <div>
        <Label htmlFor="propertyType">Loại nhà</Label>
        <select
          id="propertyType"
          {...form.register("propertyType")}
          className="mt-2 w-full rounded-xl border p-3"
        >
          <option value="">Chọn loại nhà</option>
          <option value="apartment">Căn hộ</option>
          <option value="house">Nhà nguyên căn</option>
          <option value="studio">Studio</option>
          <option value="dormitory">Ký túc xá</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="description">Mô tả phòng</Label>
        <textarea
          id="description"
          maxLength={4000}
          {...form.register("description")}
          className="mt-2 min-h-32 w-full rounded-xl border p-3"
        />
        {form.formState.errors.description && (
          <p className="text-destructive">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>
      <label className="flex gap-2">
        <input type="checkbox" {...form.register("isActive")} />
        Hiển thị tin phòng
      </label>
      <p className="text-xs text-muted-foreground">
        Có thể lấy tọa độ từ Google Maps để ghim đúng vị trí trên bản đồ.
      </p>
      {save.isError && (
        <p role="alert" className="text-destructive sm:col-span-2">
          {save.error.message}
        </p>
      )}
      <Button type="submit" disabled={save.isPending} className="sm:col-span-2">
        {save.isPending ? "Đang lưu…" : room ? "Lưu thay đổi" : "Đăng phòng"}
      </Button>
    </form>
  );
}
