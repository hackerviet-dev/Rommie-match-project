import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchingApi } from "@/features/matching";
import { Button } from "@/components/ui/button";

export function QuizMatchingRefresh() {
  const client = useQueryClient();
  const refresh = useMutation({ mutationFn: matchingApi.recalculate, onSuccess: () => {
    void client.invalidateQueries({ queryKey: ["matching"] });
  } });
  return <div className="mt-6 rounded-xl border p-4">
    <p className="text-sm text-muted-foreground">Cập nhật điểm ghép đôi theo câu trả lời mới. Thao tác này sử dụng một lượt quét của gói hiện tại.</p>
    <Button className="mt-3" variant="outline" disabled={refresh.isPending} onClick={() => refresh.mutate()}>{refresh.isPending ? "Đang cập nhật…" : "Cập nhật ghép đôi"}</Button>
    {refresh.isError && <p role="alert" className="mt-2 text-sm text-destructive">{refresh.error.message} Bài khảo sát của bạn vẫn đã được lưu.</p>}
    {refresh.isSuccess && <p role="status" className="mt-2 text-sm text-teal">Đã cập nhật điểm ghép đôi.</p>}
  </div>;
}
