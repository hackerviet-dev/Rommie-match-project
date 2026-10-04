import { MessageCircle, Search } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { QueryState } from "@/components/query-state";
import { Button, ButtonText } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";
import { normalizeSearch } from "@/utils/normalize-search";
import { formatChatTime } from "../format-time";
import { CHAT_STATUS_LABEL, useChatStatus } from "../hooks/use-chat-realtime";
import { openConversation, useConversations } from "../hooks/use-conversations";
import { goToTab } from "@/components/stack-header";

export function ChatListScreen() {
  const status = useChatStatus((state) => state.status);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const query = useConversations();
  const all = query.data?.pages.flatMap((page) => page.items) ?? [];
  const needle = normalizeSearch(search);
  const visible = all.filter(
    (conversation) =>
      (!unreadOnly || conversation.unreadCount > 0) &&
      normalizeSearch(conversation.partner.displayName).includes(needle),
  );

  const header = (
    <View className="gap-3 pb-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-ink">Hội thoại</Text>
        <View
          className={cn(
            "rounded-full px-2.5 py-1",
            status === "live" ? "bg-mint/30" : "bg-amber-100",
          )}
        >
          <Text
            className={cn(
              "text-[11px] font-semibold",
              status === "live" ? "text-teal" : "text-amber-700",
            )}
          >
            {CHAT_STATUS_LABEL[status]}
          </Text>
        </View>
      </View>
      <View className="justify-center">
        <Input
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Tìm hội thoại"
          placeholder="Tìm người trò chuyện"
          className="pl-10"
        />
        <View className="absolute left-3" pointerEvents="none">
          <Search color={colors.slate500} size={18} />
        </View>
      </View>
      <View className="flex-row gap-2">
        {[
          { label: "Tất cả", value: false },
          { label: "Chưa đọc", value: true },
        ].map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityState={{ selected: unreadOnly === item.value }}
            onPress={() => setUnreadOnly(item.value)}
            className={cn(
              "rounded-full px-4 py-2",
              unreadOnly === item.value ? "bg-mint/40" : "bg-white",
            )}
          >
            <Text
              className={cn(
                "text-xs font-semibold",
                unreadOnly === item.value ? "text-navy" : "text-slate-500",
              )}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <QueryState query={query} />
    </View>
  );

  return (
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Trò chuyện với ${item.partner.displayName}${item.unreadCount ? `, ${item.unreadCount} tin chưa đọc` : ""}`}
          onPress={() => openConversation(item.id)}
          className={cn(
            "flex-row items-center gap-3 rounded-2xl border bg-white p-3",
            item.unreadCount ? "border-teal/30" : "border-slate-100",
          )}
        >
          <UserAvatar name={item.partner.displayName} avatarUrl={item.partner.avatarUrl} />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1 text-base font-bold text-ink" numberOfLines={1}>
                {item.partner.displayName}
              </Text>
              {item.lastMessage ? (
                <Text className="text-xs text-slate-400">
                  {formatChatTime(item.lastMessage.createdAt)}
                </Text>
              ) : null}
            </View>
            <Text
              className={cn(
                "mt-0.5 text-sm",
                item.unreadCount ? "font-semibold text-ink" : "text-slate-500",
              )}
              numberOfLines={1}
            >
              {item.isBlocked
                ? "Hội thoại đã bị chặn"
                : (item.lastMessage?.content ?? "Chưa có tin nhắn")}
            </Text>
          </View>
          {item.unreadCount ? (
            <View className="h-5 min-w-5 items-center justify-center rounded-full bg-teal px-1.5">
              <Text className="text-[11px] font-bold text-white">{item.unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      )}
      ListEmptyComponent={
        query.isSuccess ? (
          <View className="items-center gap-3 py-10">
            <MessageCircle color={colors.teal} size={32} />
            <Text className="text-center text-sm leading-5 text-slate-500">
              {all.length === 0
                ? "Bạn chưa có hội thoại. Mở một hồ sơ và bấm “Nhắn tin” để bắt đầu."
                : "Không có hội thoại phù hợp."}
            </Text>
            {all.length === 0 ? (
              <Button action="primary" variant="outline" onPress={() => goToTab("/matches")}>
                <ButtonText>Tìm người ở ghép</ButtonText>
              </Button>
            ) : null}
          </View>
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
