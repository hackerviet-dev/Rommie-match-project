import type { Payment } from "./types/billing-types";

export const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")}₫`;

const PAYMENT_STATUS: Record<
  string,
  { label: string; action: "success" | "warning" | "error" | "muted" | "info" }
> = {
  pending: { label: "Chờ thanh toán", action: "warning" },
  paid: { label: "Đã thanh toán", action: "success" },
  failed: { label: "Thất bại", action: "error" },
  cancelled: { label: "Đã huỷ", action: "muted" },
  expired: { label: "Hết hạn", action: "muted" },
  refunded: { label: "Đã hoàn tiền", action: "info" },
};

export const paymentStatus = (status: string) =>
  PAYMENT_STATUS[status] ?? { label: status, action: "muted" as const };

const REFUND_STATUS: Record<string, string> = {
  pending: "Đang chờ xử lý",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  completed: "Đã hoàn tiền",
};
export const refundStatusLabel = (status: string) => REFUND_STATUS[status] ?? status;

export const canRequestRefund = (payment: Payment) =>
  Boolean(payment.refundableUntil) &&
  new Date(payment.refundableUntil ?? 0) > new Date() &&
  !payment.refundRequest;
