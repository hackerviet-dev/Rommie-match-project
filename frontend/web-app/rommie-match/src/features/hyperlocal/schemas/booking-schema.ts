import { z } from "zod";
export const bookingSchema = z.object({
  scheduledAt: z.string().refine((v) => {
    const t = new Date(v).getTime() - Date.now();
    return t >= 30 * 60000 && t <= 60 * 86400000;
  }, "Chọn lịch sau hiện tại 30 phút đến 60 ngày."),
  address: z.string().trim().min(4, "Nhập địa chỉ đầy đủ.").max(500),
  contactPhone: z
    .string()
    .trim()
    .min(7, "Nhập số điện thoại hợp lệ.")
    .max(30)
    .regex(/^\+?[\d\s().-]+$/, "Số điện thoại không hợp lệ."),
  note: z.string().max(1000),
});
