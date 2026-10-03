import { z } from "zod";
export const accessSchema = z.object({
  role: z.enum(["member", "moderator", "admin"]),
  isActive: z.boolean(),
  note: z.string().trim().min(5, "Nhập lý do từ 5 ký tự").max(2000),
});
