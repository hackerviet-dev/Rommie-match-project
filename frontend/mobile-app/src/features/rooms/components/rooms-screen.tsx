import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Plus, SlidersHorizontal } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { QueryState } from "@/components/query-state";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";
import { roomsApi } from "../services/rooms-api";
import { RoomCard } from "./room-card";

type Filters = { city: string; district: string; maxRent: string; availableBy: string };
const EMPTY: Filters = { city: "", district: "", maxRent: "", availableBy: "" };

export function RoomsScreen() {
  const me = useAuthStore((state) => state.user?.id);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const search = useDebouncedValue(filters);
  const query = useInfiniteQuery({
    queryKey: ["rooms", "list", me, search],
    queryFn: ({ pageParam }) =>
      roomsApi.search({
        page: pageParam,
        city: search.city.trim() || undefined,
        district: search.district.trim() || undefined,
        maxRent: search.maxRent ? Number(search.maxRent) : undefined,
        availableBy: search.availableBy || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.totalCount;
  const activeCount = Object.values(filters).filter(Boolean).length;
  const set = (key: keyof Filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const header = (
    <View className="gap-4 pb-4">
      <View>
        <Text className="text-2xl font-bold text-ink">Tìm căn phòng phù hợp</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Phòng do thành viên đăng, lọc theo khu vực và ngân sách.
        </Text>
      </View>
      <View className="flex-row gap-2">
        <Button
          action="primary"
          variant="outline"
          className="h-11 flex-1"
          onPress={() => router.push("/my-rooms")}
        >
          <ButtonText>Phòng của tôi</ButtonText>
        </Button>
        <Button action="primary" className="h-11 flex-1" onPress={() => router.push("/rooms/new")}>
          <ButtonIcon as={Plus} />
          <ButtonText>Đăng phòng</ButtonText>
        </Button>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            value={filters.district}
            onChangeText={(value) => set("district", value)}
            accessibilityLabel="Quận / khu vực"
            placeholder="Quận / khu vực, VD: Quận 1"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Bộ lọc phòng${activeCount ? `, đang bật ${activeCount}` : ""}`}
          accessibilityState={{ expanded: showFilters }}
          onPress={() => setShowFilters((value) => !value)}
          className={cn(
            "h-12 flex-row items-center gap-1.5 rounded-xl border px-3",
            activeCount ? "border-teal bg-mint/30" : "border-slate-200 bg-white",
          )}
        >
          <SlidersHorizontal color={colors.navy} size={18} />
          {activeCount ? <Text className="text-sm font-bold text-navy">{activeCount}</Text> : null}
        </Pressable>
      </View>
      {showFilters ? (
        <View className="gap-3 rounded-2xl border border-slate-100 bg-white p-4">
          <FormField label="Thành phố">
            <Input
              value={filters.city}
              onChangeText={(value) => set("city", value)}
              placeholder="VD: TP.HCM"
            />
          </FormField>
          <FormField label="Giá thuê tối đa (VND / tháng)">
            <Input
              value={filters.maxRent}
              onChangeText={(value) => set("maxRent", value.replace(/\D/g, ""))}
              keyboardType="number-pad"
              placeholder="VD: 5000000"
            />
          </FormField>
          <FormField label="Sẵn sàng trước ngày">
            <DateField
              value={filters.availableBy}
              onChange={(value) => set("availableBy", value)}
            />
          </FormField>
          <Button action="muted" variant="outline" size="sm" onPress={() => setFilters(EMPTY)}>
            <ButtonText>Xoá bộ lọc</ButtonText>
          </Button>
        </View>
      ) : null}
      {total !== undefined ? <Text className="text-sm text-slate-500">{total} phòng</Text> : null}
      <QueryState query={query} />
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <RoomCard room={item} />}
      ItemSeparatorComponent={() => <View className="h-3" />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        query.isSuccess ? (
          <Text className="py-10 text-center text-sm text-slate-500">
            Chưa có phòng phù hợp với bộ lọc.
          </Text>
        ) : null
      }
      ListFooterComponent={
        query.isFetchingNextPage ? <ActivityIndicator className="py-4" color={colors.teal} /> : null
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
  );
}
