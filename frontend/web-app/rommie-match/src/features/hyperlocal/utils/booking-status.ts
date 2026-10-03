export function bookingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    cancelled: "Đã hủy",
    completed: "Đã hoàn thành",
  };
  return labels[status] ?? "Đang xử lý";
}
