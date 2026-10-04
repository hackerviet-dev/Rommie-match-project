import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Bookmark, Search, SlidersHorizontal } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { QueryState } from "@/components/query-state";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";
import { matchingApi } from "../services/matching-api";
import { MatchCard } from "./match-card";
import { countActiveFilters, type ListFilters, MatchFiltersSheet } from "./match-filters-sheet";
import { MatchingRefresh } from "./matching-refresh";

const QUICK_FILTERS = [
  ["minScore", "≥90% phù hợp", 90],
  ["sameCity", "Cùng thành phố", true],
  ["petFriendly", "Yêu thú cưng", true],
  ["nonSmoking", "Không hút thuốc", true],
] as const;

export function MatchesScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ListFilters>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const q = useDebouncedValue(search.trim());
  const query = useInfiniteQuery({
    queryKey: ["matching", "list", userId, { ...filters, q }],
    queryFn: ({ pageParam }) =>
      matchingApi.list({ ...filters, q: q || undefined, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.totalCount;
  const activeCount = countActiveFilters(filters);

  const header = (
    <View className="gap-4 pb-4">
      <View className="flex-row items-end justify-between">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-ink">Người ở ghép phù hợp</Text>
          <Text className="mt-1 text-sm text-slate-500">
            {total !== undefined
              ? `${total} hồ sơ từ kết quả ghép đôi đã lưu.`
              : "Khám phá người có lối sống phù hợp với bạn."}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hồ sơ đã lưu"
          onPress={() => router.push("/saved")}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <Bookmark color={colors.navy} size={18} />
        </Pressable>
      </View>
      <MatchingRefresh />
      <View className="flex-row items-center gap-2">
        <View className="flex-1 justify-center">
          <Input
            value={search}
            onChangeText={setSearch}
            maxLength={60}
            accessibilityLabel="Tìm người ở ghép"
            placeholder="Tên hoặc sở thích…"
            returnKeyType="search"
            className="pl-10"
          />
          <View className="absolute left-3" pointerEvents="none">
            <Search color={colors.slate500} size={18} />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Bộ lọc${activeCount ? `, đang bật ${activeCount}` : ""}`}
          onPress={() => setSheetOpen(true)}
          className={cn(
            "h-12 flex-row items-center gap-1.5 rounded-xl border px-3",
            activeCount ? "border-teal bg-mint/30" : "border-slate-200 bg-white",
          )}
        >
          <SlidersHorizontal color={colors.navy} size={18} />
          {activeCount ? <Text className="text-sm font-bold text-navy">{activeCount}</Text> : null}
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {QUICK_FILTERS.map(([key, label, on]) => {
          const active = filters[key] === on;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() =>
                setFilters((current) => ({ ...current, [key]: active ? undefined : on }))
              }
              className={cn(
                "rounded-full border px-3.5 py-2",
                active ? "border-teal bg-mint/40" : "border-slate-200 bg-white",
              )}
            >
              <Text className={cn("text-sm", active ? "font-semibold text-navy" : "text-ink")}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <QueryState query={query} />
    </View>
  );

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MatchCard match={item} />}
        ItemSeparatorComponent={() => <View className="h-4" />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          query.isSuccess ? (
            <Text className="py-10 text-center text-sm text-slate-500">
              Chưa có kết quả. Thử bỏ bộ lọc hoặc tìm người phù hợp bằng lượt quét.
            </Text>
          ) : null
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator className="py-4" color={colors.teal} />
          ) : null
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            tintColor={colors.teal}
          />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />
      <MatchFiltersSheet
        open={sheetOpen}
        value={filters}
        onApply={setFilters}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
