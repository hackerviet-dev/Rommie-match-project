import { z } from "zod";
import type { Profile } from "@/features/profile";

export const onboardingDefaults = {
  name: "", age: "", gender: "", employment: "", orgName: "", hideOrg: false, city: "", bio: "",
  sleep: "", env: "", yn: {} as Record<string, string>, hasRoom: "",
  addr: "", district: "", bedrooms: "", area: "", rent: "", needed: "", moveIn: "", houseType: "",
  distance: "", roomType: "", moveInDate: "",
};
export type OnboardingValues = typeof onboardingDefaults;
export type OnboardingErrors = Partial<Record<keyof OnboardingValues | "smoke" | "drink" | "pets", string>>;
const required = (label: string) => z.string().trim().min(1, `Vui lòng nhập ${label}.`);
const choice = (label: string, options: [string, ...string[]]) => z.string().refine(value => options.includes(value), `Vui lòng chọn ${label}.`);
const number = (label: string, integer = false) => required(label).refine(value => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && (!integer || Number.isInteger(n));
}, `${label} phải là số ${integer ? "nguyên " : ""}lớn hơn 0.`);
const date = (label: string) => required(label).refine(value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}, `${label} không hợp lệ.`);
const personal = z.object({
  name: required("họ và tên").min(2, "Họ tên cần ít nhất 2 ký tự."),
  age: number("Tuổi", true).refine(value => Number(value) <= 120, "Tuổi phải từ 1 đến 120."),
  gender: choice("giới tính", ["Nam", "Nữ", "Khác", "Không muốn tiết lộ"]),
  city: required("thành phố"),
  employment: choice("tình trạng hiện tại", ["Đang đi học", "Đang đi làm", "Cả hai", "Khác"]),
  orgName: z.string(),
}).superRefine((value, ctx) => {
  if (["Đang đi học", "Đang đi làm", "Cả hai"].includes(value.employment) && !value.orgName.trim()) {
    ctx.addIssue({ code: "custom", path: ["orgName"], message: "Vui lòng nhập trường học hoặc nơi làm việc." });
  }
});
const lifestyle = z.object({
  sleep: choice("giờ đi ngủ", ["Trước 22h", "22h–0h", "Sau 0h"]),
  env: choice("không gian phòng", ["Yên tĩnh", "Vừa phải", "Sôi nổi"]),
  smoke: choice("câu trả lời về hút thuốc", ["Có", "Không"]),
  drink: choice("câu trả lời về rượu bia", ["Có", "Không"]),
  pets: choice("câu trả lời về thú cưng", ["Có", "Không"]),
});
const room = z.object({
  addr: required("địa chỉ"), district: required("quận / khu vực"),
  bedrooms: number("Số phòng ngủ", true), area: number("Diện tích"),
  rent: required("tiền thuê").refine(value => /^(?:\d+|\d{1,3}(?:[.,]\d{3})+)$/.test(value.trim()) && Number(value.replace(/[.,]/g, "")) > 0, "Tiền thuê phải là số lớn hơn 0 (VD: 3500000 hoặc 3.500.000)."),
  needed: number("Số người cần thêm", true), moveIn: date("Ngày có thể dọn vào"),
  houseType: choice("loại nhà", ["Căn hộ", "Nhà nguyên căn", "Studio", "Ký túc xá"]),
});
const searching = z.object({
  distance: choice("khoảng cách mong muốn", ["< 2 km", "2–5 km", "5–10 km", "Bất kỳ đâu trong thành phố"]),
  roomType: choice("loại phòng", ["Phòng riêng", "Phòng chung", "Studio", "Cả căn hộ"]),
  moveInDate: date("Ngày dọn vào"),
});
export function validateOnboardingStep(step: number, values: OnboardingValues): OnboardingErrors {
  const schema = step === 1 ? personal : step === 2 ? lifestyle : step === 3
    ? z.object({ hasRoom: choice("tình trạng chỗ ở", ["yes", "no"]) }) : values.hasRoom === "yes" ? room : searching;
  const result = schema.safeParse({ ...values, smoke: values.yn.smoke ?? "", drink: values.yn.drink ?? "", pets: values.yn.pets ?? "" });
  if (result.success) return {};
  const errors: OnboardingErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof OnboardingErrors;
    errors[key] ??= issue.message;
  }
  return errors;
}
export function profileToOnboarding(profile: Profile, now = new Date()): Partial<OnboardingValues> {
  let age = "";
  if (profile.birthDate) {
    const birth = new Date(`${profile.birthDate}T00:00:00`);
    let years = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years--;
    if (years > 0 && years <= 120) age = String(years);
  }
  return {
    name: profile.displayName, city: profile.city, age,
    gender: profile.gender === "male" ? "Nam" : profile.gender === "female" ? "Nữ" : profile.gender === "other" ? "Khác" : "Không muốn tiết lộ",
    bio: profile.bio ?? "", district: profile.district ?? "",
    ...(profile.occupation ? { employment: "Khác", orgName: profile.occupation } : {}),
  };
}
