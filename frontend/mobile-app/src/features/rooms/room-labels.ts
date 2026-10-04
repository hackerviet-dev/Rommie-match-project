import type { Room } from "./types/room-types";

export const PROPERTY_TYPES = [
  { value: "apartment", label: "Căn hộ" },
  { value: "house", label: "Nhà nguyên căn" },
  { value: "studio", label: "Studio" },
  { value: "dormitory", label: "Ký túc xá" },
] as const;

export const propertyTypeLabel = (value: string | null) =>
  PROPERTY_TYPES.find((type) => type.value === value)?.label ?? "Phòng ở ghép";

export const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")}₫`;

// "2026-11-01" -> "01/11/2026"
export const formatDate = (value: string) => value.split("-").reverse().join("/");

export function roomStatus(room: Room): {
  label: string;
  action: "info" | "success" | "warning" | "error" | "muted";
} {
  if (room.moderationStatus === "pending") return { label: "Chờ kiểm duyệt", action: "warning" };
  if (room.moderationStatus === "rejected") return { label: "Bị từ chối", action: "error" };
  return room.isActive
    ? { label: "Đang hiển thị", action: "success" }
    : { label: "Đã ẩn", action: "muted" };
}
