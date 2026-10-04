import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-field";
import { useAuthStore } from "@/features/auth";
import { formatVnd, roomStatus } from "../room-labels";
import { roomsApi } from "../services/rooms-api";
import { openRoom } from "./room-card";

export function MyRoomsScreen() {
  const me = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["rooms", "mine", me], queryFn: roomsApi.mine });
  const remove = useMutation({
    mutationFn: roomsApi.remove,
    onSuccess: () => {
      setDeleteId(null);
      void client.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
  const toDelete = query.data?.find((room) => room.id === deleteId);

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right"]}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(room) => room.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        ListHeaderComponent={
          <View className="gap-4 pb-2">
            <StackHeader title="Phòng của tôi" />
            <Button action="primary" className="h-11" onPress={() => router.push("/rooms/new")}>
              <ButtonIcon as={Plus} />
              <ButtonText>Đăng phòng</ButtonText>
            </Button>
            <QueryState query={query} />
          </View>
        }
        ListEmptyComponent={
          query.isSuccess ? (
            <Text className="py-10 text-center text-sm text-slate-500">
              Bạn chưa đăng phòng nào.
            </Text>
          ) : null
        }
        renderItem={({ item: room }) => {
          const status = roomStatus(room);
          return (
            <Card className="gap-3">
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 text-base font-bold text-ink" numberOfLines={2}>
                  {room.title}
                </Text>
                <Badge action={status.action} size="sm">
                  <BadgeText action={status.action}>{status.label}</BadgeText>
                </Badge>
              </View>
              <Text className="text-sm text-slate-500">
                {formatVnd(room.monthlyRent)} / tháng · {room.district}, {room.city}
              </Text>
              <View className="flex-row gap-2">
                <Button
                  action="primary"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => openRoom(room.id)}
                >
                  <ButtonText>Xem</ButtonText>
                </Button>
                <Button
                  action="primary"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() =>
                    router.push({ pathname: "/rooms/edit/[id]", params: { id: room.id } })
                  }
                >
                  <ButtonText>Sửa</ButtonText>
                </Button>
                <Button
                  action="muted"
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-300"
                  onPress={() => setDeleteId(room.id)}
                >
                  <ButtonText className="text-red-600">Xoá</ButtonText>
                </Button>
              </View>
            </Card>
          );
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Xoá tin phòng?"
        description={`"${toDelete?.title ?? ""}" sẽ bị xoá khỏi danh sách phòng của bạn và kết quả tìm kiếm. Muốn tạm ẩn thì dùng nút Sửa và tắt "Hiển thị tin phòng".`}
        confirmLabel="Xoá"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        onClose={() => setDeleteId(null)}
      >
        <FormError message={remove.error?.message} />
      </ConfirmDialog>
    </SafeAreaView>
  );
}
