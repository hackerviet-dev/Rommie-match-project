import { z } from "zod";
export const roomReviewSchema = z.object({
  message: z.string().trim().max(2000),
  note: z.string().trim().max(2000),
  status: z.enum(["approved", "rejected"]),
}).superRefine((value, ctx) => {
  if (value.status === "rejected" && value.message.length < 5) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["message"], message: "Nhập lý do gửi người đăng từ 5 ký tự khi từ chối" });
  }
});
