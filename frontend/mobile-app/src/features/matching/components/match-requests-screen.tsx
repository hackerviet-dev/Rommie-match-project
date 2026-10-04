import { useInfiniteQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { useAuthStore } from "@/features/auth";
import { colors } from "@/theme/colors";
import { matchingApi } from "../services/matching-api";
import { MatchRequestItem, useRespondToRequest } from "./match-requests";

export function MatchRequestsScreen() {
  const me = useAuthStore((state) => state.user?.id);
  const respond = useRespondToRequest();
  const query = useInfiniteQuery({
    queryKey: ["match-requests", me, "all"],
    queryFn: ({ pageParam }) => matchingApi.requests(pageParam),
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
          <View className="gap-3 pb-2">
            <StackHeader title="Đề nghị ở ghép" />
            <Text className="text-sm text-slate-500">
              Hai bên cùng xác nhận để ghi nhận ghép thành công.
            </Text>
            <QueryState query={query} />
          </View>
        }
        ListEmptyComponent={
          query.isSuccess ? (
            <Text className="py-10 text-center text-sm text-slate-500">Chưa có đề nghị.</Text>
          ) : null
        }
        renderItem={({ item }) => <MatchRequestItem request={item} respond={respond} />}
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
