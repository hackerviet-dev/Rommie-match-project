export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
};
export function queryString(values: object) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== false
    )
      query.set(key, String(value));
  });
  return query.size ? `?${query}` : "";
}
