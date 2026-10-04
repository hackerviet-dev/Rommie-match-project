export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
};

// Không dùng URLSearchParams: bản của React Native không có đủ các hàm như trên trình duyệt.
export function queryString(values: object) {
  const pairs = Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== false)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return pairs.length ? `?${pairs.join("&")}` : "";
}
