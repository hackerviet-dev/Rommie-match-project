import { findRoomProvince, isRoomArea } from "../utils/room-locations";
import { isRoomStreetAddress } from "../utils/room-address";
import { isGoogleMapsEmbedUrl } from "@/features/location/utils/google-maps-embed";
import { z } from "zod";
import { isGoogleMapsUrl } from "@/features/location/utils/google-maps-url";
import { isValidDate, vietnamToday } from "@/utils/date-rules";
const optionalNumber = (min: number, max: number) =>
  z
    .string()
    .refine(
      (v) =>
        !v ||
        (/^-?\d+(\.\d+)?$/.test(v) && Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max),
      `Giá trị phải từ ${min} đến ${max}.`,
    );
const money = (minimum: number) => z.preprocess(
  value => typeof value === "string" ? (/^\d+$/.test(value) ? Number(value) : Number.NaN) : value,
  z.number({ invalid_type_error: "Chỉ nhập số tiền bằng chữ số, không có chữ hoặc dấu phân cách." })
    .int("Nhập số tiền nguyên.").min(minimum, minimum ? "Tiền thuê phải lớn hơn 0." : "Tiền cọc không được âm.").max(1e9, "Số tiền tối đa 1.000.000.000 VND."),
);
export const roomSchema = z
  .object({
    googleMapsUrl: z.string().trim().max(2048).refine(v => !v || isGoogleMapsUrl(v), "Nhập link Google Maps HTTPS hợp lệ."),
    googleMapsEmbedUrl: z.string().trim().max(8192).refine(v => !v || isGoogleMapsEmbedUrl(v), "Mã nhúng Google Maps không hợp lệ."),
    title: z.string().trim().min(4, "Tiêu đề cần ít nhất 4 ký tự.").max(180),
    address: z.string().trim().min(4, "Nhập số nhà và tên đường.").max(500).refine(isRoomStreetAddress, "Nhập số nhà và tên đường, ví dụ: 205/10A đường Hoàng Văn Thụ."),
    city: z.string().trim().refine(v => Boolean(findRoomProvince(v)), "Chọn tỉnh / thành phố trong danh sách."),
    district: z.string().trim().min(1, "Chọn phường / xã trong danh sách.").max(100),
    description: z.string().trim().min(1, "Nhập mô tả phòng.").max(4000),
    monthlyRent: money(1),
    deposit: money(0),
    maxOccupants: z.coerce.number().int().refine((v): boolean => v === 2, "RoomieMatch chỉ hỗ trợ phòng dành cho 2 người."),
    pairOccupancyConfirmed: z.boolean().refine((v): boolean => v, "Bạn cần xác nhận cam kết ở ghép 2 người trước khi đăng phòng."),
    accuracyAndResidenceConfirmed: z.boolean().refine((v): boolean => v, "Bạn cần cam kết thông tin phòng chính xác và phối hợp đăng ký tạm trú trước khi đăng phòng."),
    availableFrom: z
      .string()
      .refine(isValidDate, "Ngày không hợp lệ.")
      .refine((v) => v >= vietnamToday(), "Chọn từ hôm nay trở đi."),
    propertyType: z.enum(["", "apartment", "house", "studio", "dormitory"]).refine(v => Boolean(v), "Chọn loại nhà."),
    bedrooms: optionalNumber(1, 50).refine(
      (v) => Boolean(v) && Number.isInteger(Number(v)),
      "Nhập số nguyên.",
    ),
    areaM2: optionalNumber(1, 99999.9).refine(v => Boolean(v), "Nhập diện tích phòng."),
    roommatesNeeded: z.string().refine((v): boolean => v === "1", "Chỉ được tuyển thêm đúng 01 người."),
    latitude: optionalNumber(-90, 90),
    longitude: optionalNumber(-180, 180),
    amenities: z.string(),
    isActive: z.boolean(),
    photoUrls: z.array(z.string().url().startsWith("https://")).min(1, "Bắt buộc thêm ít nhất 1 ảnh phòng.").max(10, "Tối đa 10 ảnh phòng."),
  })
  .superRefine((v, c) => {
    if (!isRoomArea(v.city, v.district)) c.addIssue({code:"custom",path:["district"],message:"Chọn phường / xã thuộc tỉnh / thành phố đã chọn."});
    if (!v.googleMapsUrl && !v.googleMapsEmbedUrl) c.addIssue({ code:"custom",path:["googleMapsUrl"],message:"Bắt buộc lưu link hoặc bản đồ nhúng của phòng." });
    if (Boolean(v.latitude) !== Boolean(v.longitude))
      c.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "Nhập đủ cả vĩ độ và kinh độ.",
      });
    if (v.roommatesNeeded && Number(v.roommatesNeeded) >= v.maxOccupants)
      c.addIssue({
        code: "custom",
        path: ["roommatesNeeded"],
        message: "Số người cần thêm phải nhỏ hơn số người tối đa.",
      });
    const a = v.amenities
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!a.length || a.length > 30 || a.some((x) => x.length > 60))
      c.addIssue({
        code: "custom",
        path: ["amenities"],
        message: "Nhập ít nhất 1 và tối đa 30 tiện ích, mỗi tiện ích 60 ký tự.",
      });
  });
export type RoomFormValues = z.infer<typeof roomSchema>;
export type RoomFormInput = z.input<typeof roomSchema>;
