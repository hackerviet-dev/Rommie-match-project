import { z } from "zod";

export const settingsProfileSchema = z.object({
  displayName: z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự.").max(120),
  city: z.string().trim().min(1, "Vui lòng nhập thành phố.").max(100),
  birthDate: z.string().refine((value) => {
    if (!value) return true;
    const date = new Date(`${value}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value && date <= new Date();
  }, "Ngày sinh không hợp lệ hoặc ở tương lai."),
  gender: z.enum(["", "male", "female", "other"]),
  occupation: z.string().trim().max(120),
  district: z.string().trim().max(100),
  bio: z.string().trim().max(2000),
});
export type SettingsProfileValues = z.infer<typeof settingsProfileSchema>;
