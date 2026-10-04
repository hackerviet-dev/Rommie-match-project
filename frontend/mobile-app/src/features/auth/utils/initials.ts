// "Nguyễn Văn An" -> "NA"; dùng cho avatar khi chưa có ảnh.
export function getInitials(name?: string | null) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Tên gọi trong câu chào: người Việt thường được gọi bằng tên (từ cuối).
export function getGivenName(name?: string | null) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return words[words.length - 1] ?? "";
}
