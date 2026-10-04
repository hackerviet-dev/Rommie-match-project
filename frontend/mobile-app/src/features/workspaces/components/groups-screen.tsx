import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ChevronRight, UsersRound } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, FlatList, Keyboard, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { z } from "zod";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectSheet } from "@/components/ui/select-sheet";
import { useAuthStore } from "@/features/auth";
import { roomsApi } from "@/features/rooms";
import { colors } from "@/theme/colors";
import { groupSchema } from "../schemas/workspace-schemas";
import { workspaceApi } from "../services/workspace-api";
import { groupRoleLabel } from "../utils/workspace-labels";

export const openGroup = (id: string) => router.push({ pathname: "/groups/[id]", params: { id } });

export function GroupsScreen() {
  const me = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ["groups", false, me],
    queryFn: ({ pageParam }) => workspaceApi.groups(false, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });
  const ownRooms = useQuery({ queryKey: ["rooms", "mine", me], queryFn: roomsApi.mine });
  const form = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "", roomId: "" },
  });
  const create = useMutation({
    mutationFn: (values: z.infer<typeof groupSchema>) =>
      workspaceApi.createGroup({ ...values, roomId: values.roomId || undefined }),
    onSuccess: (group) => {
      void client.invalidateQueries({ queryKey: ["groups"] });
      form.reset();
      openGroup(group.id);
    },
  });
  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      workspaceApi.respond(id, accept),
    onSuccess: () => client.invalidateQueries({ queryKey: ["groups"] }),
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  const header = (
    <View className="gap-4 pb-2">
      <StackHeader title="Nhóm ở ghép" />
      <Text className="text-sm leading-5 text-slate-500">
        Gom những người ở chung một phòng để quản lý thành viên và hoà giải khi cần. Quyền trong
        nhóm tách biệt với quyền quản trị hệ thống.
      </Text>
      <Card className="gap-3">
        <Text className="text-base font-bold text-ink">Tạo nhóm của bạn</Text>
        <FormField label="Tên nhóm" required error={form.formState.errors.name?.message}>
          <Controller
            control={form.control}
            name="name"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                accessibilityLabel="Tên nhóm"
                maxLength={160}
                placeholder="VD: Phòng 302 Lý Thường Kiệt"
              />
            )}
          />
        </FormField>
        <FormField label="Phòng của nhóm (tuỳ chọn)">
          <Controller
            control={form.control}
            name="roomId"
            render={({ field }) => (
              <SelectSheet
                title="Phòng của nhóm"
                placeholder="Chưa gắn với phòng"
                searchable={false}
                options={[
                  { label: "Chưa gắn với phòng", value: "" },
                  ...(ownRooms.data?.map((room) => ({ label: room.title, value: room.id })) ?? []),
                ]}
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
        <FormError message={create.error?.message} />
        <Button
          action="primary"
          className="h-11"
          loading={create.isPending}
          onPress={form.handleSubmit((values) => {
            Keyboard.dismiss();
            create.mutate(values);
          })}
        >
          <ButtonText>Tạo nhóm</ButtonText>
        </Button>
      </Card>
      <Text className="mt-2 text-base font-bold text-ink">Nhóm của tôi</Text>
      <QueryState query={query} />
      <FormError message={respond.error?.message} />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right"]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListEmptyComponent={
          query.isSuccess ? (
            <Text className="py-6 text-center text-sm text-slate-500">
              Chưa có nhóm hoặc lời mời.
            </Text>
          ) : null
        }
        renderItem={({ item }) =>
          item.myStatus === "invited" ? (
            <Card className="gap-3 border-teal/30 bg-mint/10">
              <View className="flex-row items-center gap-2">
                <UsersRound color={colors.navy} size={18} />
                <Text className="flex-1 text-base font-bold text-ink">{item.name}</Text>
              </View>
              <Text className="text-sm text-teal">
                Bạn có lời mời tham gia nhóm · {item.memberCount} thành viên
              </Text>
              <View className="flex-row gap-2">
                <Button
                  action="secondary"
                  size="sm"
                  className="flex-1"
                  loading={
                    respond.isPending &&
                    respond.variables?.id === item.id &&
                    respond.variables.accept
                  }
                  disabled={respond.isPending}
                  onPress={() => respond.mutate({ id: item.id, accept: true })}
                >
                  <ButtonText>Tham gia</ButtonText>
                </Button>
                <Button
                  action="muted"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={respond.isPending}
                  onPress={() => respond.mutate({ id: item.id, accept: false })}
                >
                  <ButtonText>Từ chối</ButtonText>
                </Button>
              </View>
            </Card>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mở nhóm ${item.name}`}
              onPress={() => openGroup(item.id)}
              className="flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4"
            >
              <UsersRound color={colors.navy} size={20} />
              <View className="flex-1">
                <Text className="text-base font-bold text-ink">{item.name}</Text>
                <Text className="text-xs text-slate-500">
                  {item.memberCount} thành viên
                  {item.myRole ? ` · ${groupRoleLabel(item.myRole)}` : ""}
                </Text>
              </View>
              <ChevronRight color={colors.teal} size={18} />
            </Pressable>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? <ActivityIndicator color={colors.teal} /> : null
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
      />
    </SafeAreaView>
  );
}
