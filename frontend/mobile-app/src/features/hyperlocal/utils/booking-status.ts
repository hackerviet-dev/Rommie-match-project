export function bookingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    cancelled: "Đã hủy",
    completed: "Đã hoàn thành",
  };
  return labels[status] ?? "Đang xử lý";
}

// "09:30, 06/10/2026"
export function formatBookingTime(value: string) {
  const date = new Date(value);
  const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const day = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${time}, ${day}`;
}
