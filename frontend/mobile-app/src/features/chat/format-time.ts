// Hôm nay: "14:05"; ngày khác: "03/10".
export function formatChatTime(value: string, now = new Date()) {
  const date = new Date(value);
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
