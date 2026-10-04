import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Button, ButtonText } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthStore } from "@/features/auth";
import { openProfile } from "@/features/matching/components/match-card";
import { colors } from "@/theme/colors";
import { savedProfilesApi, useSavedProfiles } from "../hooks/use-saved-profiles";

export function SavedProfilesScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  const saved = useSavedProfiles();
  const query = useInfiniteQuery({
    queryKey: ["saved-profiles", "list", userId],
    queryFn: ({ pageParam }) => savedProfilesApi.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right"]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        ListHeaderComponent={
          <View className="gap-3 pb-2">
            <StackHeader title="Hồ sơ đã lưu" />
            <QueryState query={query} />
          </View>
        }
        ListEmptyComponent={
          query.isSuccess ? (
            <View className="items-center gap-3 py-10">
              <Text className="text-center text-sm text-slate-500">Chưa có hồ sơ đã lưu.</Text>
              <Button
                action="primary"
                variant="outline"
                onPress={() => router.navigate("/matches")}
              >
                <ButtonText>Khám phá ở ghép</ButtonText>
              </Button>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const removing = saved.mutation.isPending && saved.mutation.variables?.id === item.userId;
          return (
            <View className="flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xem hồ sơ ${item.displayName}`}
                onPress={() => openProfile(item.userId)}
                className="min-w-0 flex-1 flex-row items-center gap-3"
              >
                <UserAvatar name={item.displayName} avatarUrl={item.avatarUrl} />
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-ink" numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  <Text className="text-xs text-slate-500" numberOfLines={1}>
                    {[item.occupation, item.city].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <ChevronRight color={colors.teal} size={18} />
              </Pressable>
              <Button
                action="muted"
                variant="outline"
                size="sm"
                loading={removing}
                onPress={() => saved.mutation.mutate({ id: item.userId, saved: false })}
              >
                <ButtonText>Bỏ lưu</ButtonText>
              </Button>
            </View>
          );
        }}
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
