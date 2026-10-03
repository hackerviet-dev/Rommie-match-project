import { z } from "zod";
export const groupSchema = z.object({
  name: z.string().trim().min(3, "Nhập tên nhóm từ 3 ký tự").max(160),
  roomId: z
    .union([z.string().uuid("Mã dữ liệu chưa hợp lệ"), z.literal("")])
    .optional(),
});
export const inviteSchema = z.object({
  email: z.string().trim().email("Email chưa hợp lệ"),
});
export const disputeSchema = z.object({
  respondentId: z.string().uuid("Chọn thành viên liên quan"),
  roomId: z
    .union([z.string().uuid("Mã dữ liệu chưa hợp lệ"), z.literal("")])
    .optional(),
  groupId: z
    .union([z.string().uuid("Mã dữ liệu chưa hợp lệ"), z.literal("")])
    .optional(),
  title: z.string().trim().min(5, "Tiêu đề từ 5 ký tự").max(180),
  details: z.string().trim().min(20, "Mô tả ít nhất 20 ký tự").max(5000),
});
export const messageSchema = z.object({
  content: z.string().trim().min(1, "Nhập phản hồi").max(4000),
});
export const reviewSchema = z.object({
  status: z.enum(["investigating", "resolved", "dismissed"]),
  note: z.string().trim().min(5, "Nhập ghi chú xử lý từ 5 ký tự").max(2000),
});
