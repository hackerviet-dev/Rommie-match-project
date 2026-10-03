import { z } from "zod";
export const roomReviewSchema = z.object({
  note: z.string().trim().min(5, "Nhập lý do/căn cứ từ 5 ký tự").max(2000),
  status: z.enum(["approved", "rejected"]),
});
