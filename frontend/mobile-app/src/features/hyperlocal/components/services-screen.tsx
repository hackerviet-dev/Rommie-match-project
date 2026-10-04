import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { CalendarCheck, SlidersHorizontal } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { QueryState } from "@/components/query-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";
import { DEFAULT_SERVICE_CITY, SERVICE_CATEGORIES } from "../categories";
import { hyperlocalApi } from "../services/hyperlocal-api";
import { ServiceCard } from "./service-card";

export function ServicesScreen() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState(DEFAULT_SERVICE_CITY);
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const search = useDebouncedValue({ q: q.trim(), city: city.trim(), district: district.trim() });
  const query = useInfiniteQuery({
    queryKey: ["services", search.city, search.district, category, search.q],
    queryFn: ({ pageParam }) =>
      hyperlocalApi.list(
        search.city || DEFAULT_SERVICE_CITY,
        search.district || undefined,
        category || undefined,
        pageParam,
        search.q || undefined,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.totalCount;

  const header = (
    <View className="gap-4 pb-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-ink">Dịch vụ gần nhà</Text>
          <Text className="mt-1 text-sm text-slate-500">
            Tìm nhà cung cấp và đặt lịch phù hợp với bạn.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lịch đặt của tôi"
          onPress={() => router.push("/bookings")}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <CalendarCheck color={colors.navy} size={18} />
        </Pressable>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            value={q}
            onChangeText={setQ}
            accessibilityLabel="Tìm dịch vụ"
            placeholder="Tên hoặc danh mục…"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Khu vực"
          accessibilityState={{ expanded: showFilters }}
          onPress={() => setShowFilters((value) => !value)}
          className={cn(
            "h-12 items-center justify-center rounded-xl border px-3",
            district || city !== DEFAULT_SERVICE_CITY
              ? "border-teal bg-mint/30"
              : "border-slate-200 bg-white",
          )}
        >
          <SlidersHorizontal color={colors.navy} size={18} />
        </Pressable>
      </View>
      {showFilters ? (
        <View className="gap-3 rounded-2xl border border-slate-100 bg-white p-4">
          <FormField label="Thành phố">
            <Input value={city} onChangeText={setCity} placeholder={DEFAULT_SERVICE_CITY} />
          </FormField>
          <FormField label="Quận / khu vực">
            <Input value={district} onChangeText={setDistrict} placeholder="VD: Quận 1" />
          </FormField>
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {["", ...Object.keys(SERVICE_CATEGORIES)].map((item) => {
          const active = category === item;
          return (
            <Pressable
              key={item || "all"}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setCategory(item)}
              className={cn(
                "rounded-full border px-4 py-2",
                active ? "border-navy bg-navy" : "border-slate-200 bg-white",
              )}
            >
              <Text className={cn("text-sm font-semibold", active ? "text-white" : "text-ink")}>
                {item || "Tất cả"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {total !== undefined ? <Text className="text-sm text-slate-500">{total} dịch vụ</Text> : null}
      <QueryState query={query} />
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ServiceCard service={item} />}
      ItemSeparatorComponent={() => <View className="h-3" />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        query.isSuccess ? (
          <Text className="py-10 text-center text-sm text-slate-500">Chưa có dịch vụ phù hợp.</Text>
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
