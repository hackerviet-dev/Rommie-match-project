import { Button } from "@/components/ui/button";
export function QueryState({
  query,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
}) {
  if (query.isPending)
    return (
      <p role="status" className="py-6 text-muted-foreground">
        Đang tải…
      </p>
    );
  if (query.isError)
    return (
      <div
        role="alert"
        className="my-4 rounded-xl border border-destructive/30 p-4 text-destructive"
      >
        <p>{query.error?.message || "Không thể tải dữ liệu."}</p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => void query.refetch()}
        >
          Thử lại
        </Button>
      </div>
    );
  return null;
}
export function Pagination({
  page,
  hasNext,
  onChange,
}: {
  page: number;
  hasNext: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Trang trước
      </Button>
      <span>Trang {page}</span>
      <Button
        variant="outline"
        disabled={!hasNext}
        onClick={() => onChange(page + 1)}
      >
        Trang sau
      </Button>
    </div>
  );
}
