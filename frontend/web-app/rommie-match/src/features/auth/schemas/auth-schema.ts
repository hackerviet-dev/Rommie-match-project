import { z } from "zod";
export const loginSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});
export const registerSchema = loginSchema.extend({
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự.").max(200),
  displayName: z.string().trim().min(2, "Họ tên cần ít nhất 2 ký tự.").max(120),
  city: z.string().trim().min(1, "Vui lòng chọn thành phố.").max(100),
  district: z.string().max(100).nullable().optional(),
  birthDate: z.string().nullable().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  occupation: z.string().max(120).nullable().optional(),
});
