import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ChevronRight, Plus } from "lucide-react-native";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth";
import { colors } from "@/theme/colors";
import { workspaceApi } from "../services/workspace-api";
import { disputeStatusLabel } from "../utils/workspace-labels";

export const disputeStatusAction = (status: string) =>
  status === "resolved"
    ? ("success" as const)
    : status === "dismissed"
      ? ("muted" as const)
      : status === "investigating"
        ? ("info" as const)
        : ("warning" as const);

export function DisputesScreen() {
  const me = useAuthStore((state) => state.user?.id);
  const query = useInfiniteQuery({
    queryKey: ["disputes", false, me],
    queryFn: ({ pageParam }) => workspaceApi.disputes(false, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right"]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        ListHeaderComponent={
          <View className="gap-4 pb-2">
            <StackHeader title="Yêu cầu hoà giải" />
            <Text className="text-sm leading-5 text-slate-500">
              Lưu diễn biến và ý kiến của hai bên. Kết luận xử lý được giữ trong hồ sơ.
            </Text>
            <Button action="primary" className="h-11" onPress={() => router.push("/disputes/new")}>
              <ButtonIcon as={Plus} />
              <ButtonText>Tạo yêu cầu hỗ trợ</ButtonText>
            </Button>
            <QueryState query={query} />
          </View>
        }
        ListEmptyComponent={
          query.isSuccess ? (
            <Text className="py-6 text-center text-sm text-slate-500">Chưa có tranh chấp.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hồ sơ ${item.title}, ${disputeStatusLabel(item.status)}`}
            onPress={() => router.push({ pathname: "/disputes/[id]", params: { id: item.id } })}
            className="flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4"
          >
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-base font-bold text-ink" numberOfLines={2}>
                {item.title}
              </Text>
              <Text className="text-xs text-slate-500" numberOfLines={1}>
                {item.complainantName} ↔ {item.respondentName}
              </Text>
              <View className="flex-row">
                <Badge action={disputeStatusAction(item.status)} size="sm">
                  <BadgeText action={disputeStatusAction(item.status)}>
                    {disputeStatusLabel(item.status)}
                  </BadgeText>
                </Badge>
              </View>
            </View>
            <ChevronRight color={colors.teal} size={18} />
          </Pressable>
        )}
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
