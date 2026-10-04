import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { FormScreen } from "@/components/form-screen";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { FormError } from "@/components/ui/form-field";
import { useAuthStore } from "@/features/auth";
import { roomsApi } from "../services/rooms-api";
import { RoomEditor } from "./room-editor";

export function RoomEditorScreen({ id }: { id?: string }) {
  const me = useAuthStore((state) => state.user?.id);
  const query = useQuery({
    queryKey: ["rooms", "detail", me, id],
    queryFn: () => roomsApi.get(id ?? ""),
    enabled: Boolean(id),
  });
  return (
    <FormScreen>
      <StackHeader title={id ? "Chỉnh sửa phòng" : "Đăng phòng"} />
      <Text className="mb-5 mt-4 text-sm leading-5 text-slate-500">
        Tin mới hoặc nội dung sửa sẽ được kiểm duyệt trước khi hiển thị công khai.
      </Text>
      {id ? <QueryState query={query} /> : null}
      {id && query.data && query.data.ownerUserId !== me ? (
        <FormError message="Bạn không có quyền sửa phòng này." />
      ) : !id || query.data ? (
        <RoomEditor key={id ?? "new"} room={query.data} />
      ) : null}
    </FormScreen>
  );
}
