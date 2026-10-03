import { z } from "zod";
import { isValidDate, vietnamToday } from "@/utils/date-rules";
const optionalNumber = (min: number, max: number) =>
  z
    .string()
    .refine(
      (v) =>
        !v ||
        (Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max),
      `Giá trị phải từ ${min} đến ${max}.`,
    );
export const roomSchema = z
  .object({
    title: z.string().trim().min(4, "Tiêu đề cần ít nhất 4 ký tự.").max(180),
    address: z.string().trim().min(4, "Nhập địa chỉ đầy đủ.").max(500),
    city: z.string().trim().min(1, "Nhập thành phố.").max(100),
    district: z.string().trim().min(1, "Nhập quận / khu vực.").max(100),
    description: z.string().max(4000),
    monthlyRent: z.coerce.number().int().min(0).max(1e9),
    deposit: z.coerce.number().int().min(0).max(1e9),
    maxOccupants: z.coerce.number().int().min(1).max(20),
    availableFrom: z
      .string()
      .refine(isValidDate, "Ngày không hợp lệ.")
      .refine((v) => v >= vietnamToday(), "Chọn từ hôm nay trở đi."),
    propertyType: z.enum(["", "apartment", "house", "studio", "dormitory"]),
    bedrooms: optionalNumber(1, 50).refine(
      (v) => !v || Number.isInteger(Number(v)),
      "Nhập số nguyên.",
    ),
    areaM2: optionalNumber(1, 99999.9),
    roommatesNeeded: optionalNumber(1, 20).refine(
      (v) => !v || Number.isInteger(Number(v)),
      "Nhập số nguyên.",
    ),
    latitude: optionalNumber(-90, 90),
    longitude: optionalNumber(-180, 180),
    amenities: z.string(),
    isActive: z.boolean(),
  })
  .superRefine((v, c) => {
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
    if (a.length > 30 || a.some((x) => x.length > 60))
      c.addIssue({
        code: "custom",
        path: ["amenities"],
        message: "Tối đa 30 tiện ích, mỗi tiện ích 60 ký tự.",
      });
  });
export type RoomFormValues = z.infer<typeof roomSchema>;
