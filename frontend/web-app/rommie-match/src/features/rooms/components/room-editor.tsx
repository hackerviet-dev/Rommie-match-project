import { roomProvinces, findRoomProvince, isRoomArea } from "../utils/room-locations";
import { vietnameseMoney } from "../utils/vietnamese-money";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { roomSchema, type RoomFormValues, type RoomFormInput } from "../schemas/room-schema";
import { roomsApi } from "../services/rooms-api";
import type { Room } from "../types/room-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { vietnamToday } from "@/utils/date-rules";
import { useState } from "react";
import { RoomLocationEditor } from "./room-location-editor";
import { RoomPhotoEditor } from "./room-photo-editor";
export function RoomEditor({ room }: { room?: Room }) {
  const [isLocationPending, setIsLocationPending] = useState(false), [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate(),
    client = useQueryClient(),
    form = useForm<RoomFormInput, unknown, RoomFormValues>({
      resolver: zodResolver(roomSchema),
      mode: "onChange",
      reValidateMode: "onChange",
      defaultValues: {
        googleMapsEmbedUrl: room?.googleMapsEmbedUrl ?? "",
        googleMapsUrl: room?.googleMapsUrl ?? "",
        title: room?.title ?? "",
        address: room?.address ?? "",
        city: findRoomProvince(room?.city ?? "")?.name ?? "",
        district: isRoomArea(room?.city ?? "", room?.district ?? "") ? room!.district : "",
        description: room?.description ?? "",
        monthlyRent: room?.monthlyRent ?? 0,
        deposit: room?.deposit ?? 0,
        maxOccupants: 2,
        pairOccupancyConfirmed: false,
        accuracyAndResidenceConfirmed: false,
        availableFrom: room?.availableFrom ?? vietnamToday(),
        propertyType: (room?.propertyType ??
          "") as RoomFormValues["propertyType"],
        bedrooms: room?.bedrooms?.toString() ?? "",
        areaM2: room?.areaM2?.toString() ?? "",
        roommatesNeeded: "1",
        latitude: room?.latitude?.toString() ?? "",
        longitude: room?.longitude?.toString() ?? "",
        amenities: room?.amenities.join(", ") ?? "",
        isActive: room?.isActive ?? true,
        photoUrls: room?.photoUrls ?? [],
      },
    });
  const save = useMutation({
    mutationFn: (v: RoomFormValues) => {
      const body = {
        ...v,
        googleMapsUrl: v.googleMapsUrl || null,
        googleMapsEmbedUrl: v.googleMapsEmbedUrl || null,
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
  const fields: [keyof RoomFormValues, string, string, string, string][] = [
    ["title", "Tiêu đề *", "text", "VD: Tìm 01 bạn ở ghép phòng 25 m² tại Phú Nhuận", "Nêu khu vực và điểm nổi bật của phòng, tối đa 180 ký tự."],
    ["address", "Địa chỉ *", "text", "VD: 205/10A đường Hoàng Văn Thụ", "Chỉ nhập số nhà và tên đường. Phường/xã và tỉnh/thành phố chọn ở các ô bên dưới; địa chỉ phải khớp bản đồ."],
    ["city", "Tỉnh / thành phố *", "select", "Chọn tỉnh / thành phố", "Chọn nơi có phòng trong danh sách."],
    ["district", "Phường / xã / khu vực *", "select", "Chọn phường / xã", "Danh sách phụ thuộc tỉnh / thành phố đã chọn."],
    ["monthlyRent", "Tiền thuê mỗi tháng (VND) *", "number", "VD: 3500000", "Ghi rõ trong mô tả đây là giá cả phòng hay phần mỗi người; nhập số lớn hơn 0, không có dấu chấm/phẩy."],
    ["deposit", "Tiền cọc (VND) *", "number", "VD: 3500000", "Nhập số tiền cọc; điền 0 nếu không thu cọc."],
    ["bedrooms", "Số phòng ngủ *", "number", "VD: 1", "Nhập số nguyên từ 1 đến 50."],
    ["areaM2", "Diện tích (m²) *", "number", "VD: 25", "Nhập diện tích sử dụng của phòng; có thể nhập số thập phân, ví dụ 25.5."],
    ["availableFrom", "Ngày có thể dọn vào *", "date", "", "Chọn ngày phòng sẵn sàng đón bạn mới, từ hôm nay trở đi."],
    ["amenities", "Tiện ích (cách nhau bằng dấu phẩy) *", "text", "VD: Máy lạnh, Wi-Fi, Máy giặt, Chỗ để xe", "Nhập ít nhất 1 tiện ích, tối đa 30 mục; phân cách bằng dấu phẩy."],
  ];
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((v) => { if (isLocationPending) form.setError("googleMapsUrl", { message: "Bấm Lưu vị trí để xác nhận bản đồ trước khi gửi." }); if (!isLocationPending && !isUploading) save.mutate(v); })}
      className="grid gap-5 sm:grid-cols-2"
    >
      <div className="rounded-xl border border-teal/30 bg-teal/10 p-4 text-sm text-navy sm:col-span-2">
        <p className="font-semibold">Chỉ hỗ trợ ở ghép theo cặp 2 người</p>
        <p className="mt-1">Phòng hiện có tối đa 01 người đang ở và chỉ tuyển thêm đúng 01 người. Tổng số người sau khi ghép là 2.</p>
        <input type="hidden" {...form.register("maxOccupants")} />
        <input type="hidden" {...form.register("roommatesNeeded")} />
      </div>
      <div className="sm:col-span-2"><RoomLocationEditor value={form.watch("googleMapsEmbedUrl")} linkValue={form.watch("googleMapsUrl")} onChange={value => { form.setValue("googleMapsEmbedUrl", value, { shouldDirty:true,shouldValidate:true }); }} onLinkChange={value => { form.setValue("googleMapsUrl", value, { shouldDirty:true,shouldValidate:true }); form.setValue("latitude", "", { shouldDirty:true }); form.setValue("longitude", "", { shouldDirty:true }); }} onPendingChange={setIsLocationPending} error={form.formState.errors.googleMapsEmbedUrl?.message || form.formState.errors.googleMapsUrl?.message} /></div>
      {fields.map(([key, label, type, placeholder, hint]) => (
        <div key={key}>
          <Label htmlFor={key}>{label}</Label>
          {type === "select" ? <select id={key} aria-describedby={`${key}-hint ${key}-error`}
            aria-invalid={Boolean(form.formState.errors[key])}
            disabled={key === "district" && !findRoomProvince(form.watch("city"))}
            className="mt-2 h-11 w-full rounded-xl border border-input bg-card px-3 shadow-sm disabled:opacity-50"
            {...form.register(key, {onChange: () => {
              if (key === "city") form.setValue("district", "", {shouldDirty:true,shouldValidate:true});
              form.setValue("latitude", "", {shouldDirty:true}); form.setValue("longitude", "", {shouldDirty:true});
            }})}>
            <option value="">{key === "district" && !form.watch("city") ? "Chọn tỉnh / thành phố trước" : placeholder}</option>
            {(key === "city" ? roomProvinces.map(p => p.name) : findRoomProvince(form.watch("city"))?.areas ?? []).map(name => <option key={name} value={name}>{name}</option>)}
          </select> : <Input
            id={key}
            type={type === "number" ? "text" : type}
            inputMode={type === "number" ? key === "areaM2" ? "decimal" : "numeric" : undefined}
            placeholder={placeholder}
            aria-describedby={`${key}-hint ${key}-error${key === "monthlyRent" || key === "deposit" ? ` ${key}-words` : ""}`}
            step={type === "number" ? "any" : undefined}
            min={type === "date" ? vietnamToday() : undefined}
            {...form.register(key, { onChange: () => { if (["address", "district", "city"].includes(key)) { form.setValue("latitude", "", { shouldDirty: true }); form.setValue("longitude", "", { shouldDirty: true }); } } })}
            aria-invalid={Boolean(form.formState.errors[key])}
            className="mt-2"
          />}
          {(key === "monthlyRent" || key === "deposit") && <p id={`${key}-words`} aria-live="polite" className="mt-1.5 text-sm font-medium text-teal">{vietnameseMoney(form.watch(key))}</p>}
          <p id={`${key}-hint`} className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
          {form.formState.errors[key] && (
            <p id={`${key}-error`} role="alert" className="mt-1 text-xs text-destructive">
              {form.formState.errors[key]?.message}
            </p>
          )}
        </div>
      ))}
      <div>
        <Label htmlFor="propertyType">Loại nhà *</Label>
        <select
          id="propertyType"
          aria-describedby="property-type-hint"
          {...form.register("propertyType")}
          className="mt-2 w-full rounded-xl border p-3"
        >
          <option value="">Chọn loại nhà</option>
          <option value="apartment">Căn hộ</option>
          <option value="house">Nhà nguyên căn</option>
          <option value="studio">Studio</option>
          <option value="dormitory">Ký túc xá</option>
        </select><p id="property-type-hint" className="mt-1.5 text-xs text-muted-foreground">Chọn loại nhà thực tế của phòng đang đăng.</p>{form.formState.errors.propertyType && <p role="alert" className="mt-1 text-xs text-destructive">{form.formState.errors.propertyType.message}</p>}
      </div>
      <RoomPhotoEditor validationError={form.formState.errors.photoUrls?.message} urls={form.watch("photoUrls")} onChange={urls => form.setValue("photoUrls", urls, { shouldDirty: true, shouldValidate: true })} onBusyChange={setIsUploading} />
      <div className="sm:col-span-2">
        <Label htmlFor="description">Mô tả phòng *</Label>
        <textarea
          id="description"
          maxLength={4000}
          aria-describedby="description-hint"
          placeholder={"VD: Phòng 25 m², có cửa sổ và máy lạnh. Hiện mình đang ở một người, tìm thêm 01 bạn.\nTiền thuê: 3.500.000đ/người/tháng; điện, nước và gửi xe tính riêng.\nBạn ở ghép mong muốn: nam / nữ / không yêu cầu giới tính (ghi rõ lựa chọn của bạn).\nYêu cầu riêng: hút thuốc, thú cưng, giờ về, khách đến chơi và chia việc dọn dẹp.\nThời gian xem phòng và ngày có thể dọn vào…"}
          {...form.register("description")}
          className="mt-2 min-h-32 w-full rounded-xl border p-3"
        />
        <p id="description-hint" className="mt-1.5 text-xs text-muted-foreground">Nêu tình trạng phòng, người đang ở, cách chia tiền và chi phí khác. Ghi rõ mong muốn về giới tính bạn ở ghép và các yêu cầu riêng: hút thuốc, thú cưng, giờ giấc, khách đến chơi, chia việc nhà. Tối đa 4000 ký tự.</p>
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
        Vị trí được lưu khi gửi kiểm duyệt. Hãy kiểm tra bản đồ và nhập đúng địa chỉ phòng.
      </p>
      {save.isError && (
        <p role="alert" className="text-destructive sm:col-span-2">
          {save.error.message}
        </p>
      )}
      <div className="rounded-xl border p-4 sm:col-span-2">
        <label className="flex cursor-pointer items-start gap-3" htmlFor="pair-occupancy-confirmed">
          <input id="pair-occupancy-confirmed" type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-teal" {...form.register("pairOccupancyConfirmed")} aria-invalid={Boolean(form.formState.errors.pairOccupancyConfirmed)} aria-describedby={form.formState.errors.pairOccupancyConfirmed ? "pair-occupancy-error" : undefined} />
          <span className="text-sm">Tôi cam kết căn phòng này hiện chỉ có <strong>TỐI ĐA 01 người đang ở</strong> và chỉ tuyển thêm <strong>ĐÚNG 01 người</strong> để ghép thành cặp 2 người.</span>
        </label>
        {form.formState.errors.pairOccupancyConfirmed && <p id="pair-occupancy-error" role="alert" className="mt-2 text-xs text-destructive">{form.formState.errors.pairOccupancyConfirmed.message}</p>}
      </div>
      <div className="rounded-xl border p-4 sm:col-span-2">
        <label className="flex cursor-pointer items-start gap-3" htmlFor="accuracy-residence-confirmed">
          <input id="accuracy-residence-confirmed" type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-teal" {...form.register("accuracyAndResidenceConfirmed")} aria-invalid={Boolean(form.formState.errors.accuracyAndResidenceConfirmed)} aria-describedby={form.formState.errors.accuracyAndResidenceConfirmed ? "accuracy-residence-error" : undefined} />
          <span className="text-sm">Tôi cam kết thông tin phòng chính xác và sẵn sàng phối hợp đăng ký tạm trú cho thành viên mới theo đúng quy định pháp luật.</span>
        </label>
        {form.formState.errors.accuracyAndResidenceConfirmed && <p id="accuracy-residence-error" role="alert" className="mt-2 text-xs text-destructive">{form.formState.errors.accuracyAndResidenceConfirmed.message}</p>}
      </div>
      <Button type="submit" disabled={save.isPending || isUploading} className="sm:col-span-2">
        {save.isPending ? "Đang lưu…" : isUploading ? "Chờ upload ảnh…" : isLocationPending ? "Xác nhận vị trí trước khi gửi" : room ? "Lưu và gửi kiểm duyệt lại" : "Gửi kiểm duyệt"}
      </Button>
    </form>
  );
}
