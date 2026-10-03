import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { QueryState } from "@/components/common/query-state";
import { roomsApi } from "@/features/rooms/services/rooms-api";
import { RoomEditor } from "@/features/rooms/components/room-editor";
import { useAuthStore } from "@/features/auth";
export default function RoomEditorPage() {
  const { id } = useParams(),
    me = useAuthStore((s) => s.user?.id),
    query = useQuery({
      queryKey: ["rooms", "detail", me, id],
      queryFn: () => roomsApi.get(id!),
      enabled: Boolean(id),
    });
  return (
    <AppShell>
      <h1 className="text-3xl font-display font-bold">
        {id ? "Chỉnh sửa phòng" : "Đăng phòng"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tin mới hoặc nội dung sửa sẽ được kiểm duyệt trước khi hiển thị công
        khai.
      </p>
      <Card className="mt-6 rounded-3xl p-6">
        {id && <QueryState query={query} />}{" "}
        {id && query.data?.ownerUserId !== me && query.data ? (
          <p role="alert">Bạn không có quyền sửa phòng này.</p>
        ) : (
          (!id || query.data) && <RoomEditor key={id} room={query.data} />
        )}
      </Card>
    </AppShell>
  );
}
