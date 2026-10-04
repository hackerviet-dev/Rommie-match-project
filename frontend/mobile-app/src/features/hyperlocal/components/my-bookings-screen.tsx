import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonText } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth";
import { colors } from "@/theme/colors";
import { bookingsApi } from "../services/bookings-api";
import { bookingStatusLabel, formatBookingTime } from "../utils/booking-status";
import { bookingStatusAction } from "./booking-status-badge";

export function MyBookingsScreen() {
  const me = useAuthStore((state) => state.user?.id);
  const query = useInfiniteQuery({
    queryKey: ["bookings", "list", me],
    queryFn: ({ pageParam }) => bookingsApi.list(pageParam),
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
            <StackHeader title="Lịch đặt của tôi" />
            <QueryState query={query} />
          </View>
        }
        ListEmptyComponent={
          query.isSuccess ? (
            <View className="items-center gap-3 py-10">
              <Text className="text-sm text-slate-500">Chưa có lịch đặt.</Text>
              <Button
                action="primary"
                variant="outline"
                onPress={() => router.navigate("/services")}
              >
                <ButtonText>Khám phá dịch vụ</ButtonText>
              </Button>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Lịch ${item.serviceName}, ${bookingStatusLabel(item.status)}`}
            onPress={() => router.push({ pathname: "/bookings/[id]", params: { id: item.id } })}
            className="flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4"
          >
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-base font-bold text-ink" numberOfLines={1}>
                {item.serviceName}
              </Text>
              <Text className="text-sm text-slate-500">
                {formatBookingTime(item.scheduledAt)}
              </Text>
              <View className="flex-row">
                <Badge action={bookingStatusAction(item.status)} size="sm">
                  <BadgeText action={bookingStatusAction(item.status)}>
                    {bookingStatusLabel(item.status)}
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
