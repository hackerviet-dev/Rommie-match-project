import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QueryState } from "@/components/query-state";
import { goBack } from "@/components/stack-header";
import { FormError } from "@/components/ui/form-field";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthStore } from "@/features/auth";
import { openProfile } from "@/features/matching/components/match-card";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";
import { formatChatTime } from "../format-time";
import { chatApi } from "../services/chat-api";

const MAX_LENGTH = 2000;

export function ConversationScreen({ id }: { id: string }) {
  const me = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const [draft, setDraft] = useState("");
  const conversation = useQuery({
    queryKey: ["chat", "conversation", me, id],
    queryFn: () => chatApi.get(id),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });
  // API trả tin mới nhất trước, trang sau là tin cũ hơn (beforeId).
  const messages = useInfiniteQuery({
    queryKey: ["chat", "messages", me, id],
    queryFn: ({ pageParam }) => chatApi.messages(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.items.at(-1)?.id : undefined),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });
  const read = useMutation({
    mutationFn: chatApi.read,
    onSuccess: () => client.invalidateQueries({ queryKey: ["chat", "conversations"] }),
  });
  const send = useMutation({
    mutationFn: (content: string) => chatApi.send(id, content),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["chat"] }),
  });

  const unread = conversation.data?.unreadCount ?? 0;
  const markRead = read.mutate;
  useEffect(() => {
    if (id && unread > 0) markRead(id);
  }, [id, unread, markRead]);

  // Danh sách đảo ngược (inverted): phần tử đầu nằm dưới cùng, nên giữ thứ tự mới → cũ.
  const rows = [
    ...new Map(
      (messages.data?.pages.flatMap((page) => page.items) ?? []).map((m) => [m.id, m]),
    ).values(),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lastMineRead = rows.find((m) => m.senderId === me)?.readAt;
  const partner = conversation.isError ? undefined : conversation.data?.partner;
  const blocked = conversation.data?.isBlocked ?? false;
  const content = draft.trim();
  const submit = () => {
    if (!content || send.isPending || blocked) return;
    // Xoá ô nhập ngay (tin có thể về qua realtime trước khi POST trả lời); lỗi thì trả lại.
    setDraft("");
    send.mutate(content, { onError: () => setDraft((current) => current || content) });
  };

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right", "bottom"]}>
      <View className="flex-row items-center gap-3 border-b border-slate-100 bg-white px-3 py-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại danh sách tin nhắn"
          onPress={goBack}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <ArrowLeft color={colors.navy} size={20} />
        </Pressable>
        {partner ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem hồ sơ ${partner.displayName}`}
            onPress={() => openProfile(partner.userId)}
            className="min-w-0 flex-1 flex-row items-center gap-3"
          >
            <UserAvatar size="sm" name={partner.displayName} avatarUrl={partner.avatarUrl} />
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-ink" numberOfLines={1}>
                {partner.displayName}
              </Text>
              <Text className="text-xs text-teal">Xem hồ sơ</Text>
            </View>
          </Pressable>
        ) : (
          <Text className="flex-1 text-base font-bold text-ink">Hội thoại</Text>
        )}
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View className="px-4">
          <QueryState query={conversation} />
        </View>
        <FlatList
          inverted
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item, index }) => {
            const mine = item.senderId === me;
            return (
              <View className={cn("max-w-[80%] gap-1", mine ? "self-end" : "self-start")}>
                <View
                  className={cn(
                    "rounded-2xl px-4 py-2.5",
                    mine ? "rounded-br-md bg-navy" : "rounded-bl-md bg-white",
                  )}
                >
                  <Text className={cn("text-base leading-6", mine ? "text-white" : "text-ink")}>
                    {item.content}
                  </Text>
                </View>
                <Text className={cn("text-[11px] text-slate-400", mine && "text-right")}>
                  {formatChatTime(item.createdAt)}
                  {mine && index === 0 && lastMineRead ? " · Đã xem" : ""}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            messages.isSuccess ? (
              <Text
                className="py-10 text-center text-sm text-slate-500"
                style={{ transform: [{ scaleY: -1 }] }}
              >
                Chưa có tin nhắn. Hãy chào hỏi và hỏi về giờ giấc, ngân sách, quy tắc ở chung.
              </Text>
            ) : null
          }
          ListFooterComponent={
            messages.isFetchingNextPage || messages.isPending ? (
              <ActivityIndicator className="py-3" color={colors.teal} />
            ) : null
          }
          onEndReached={() => {
            if (messages.hasNextPage && !messages.isFetchingNextPage) void messages.fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
        />
        <View className="gap-2 border-t border-slate-100 bg-white px-3 py-2">
          {blocked ? (
            <Text className="text-center text-sm text-slate-500">
              Không thể nhắn tin trong hội thoại này.
            </Text>
          ) : (
            <View className="flex-row items-end gap-2">
              <TextInput
                value={draft}
                onChangeText={setDraft}
                accessibilityLabel="Nội dung tin nhắn"
                placeholder="Nhập tin nhắn…"
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={MAX_LENGTH}
                className="max-h-32 min-h-11 flex-1 rounded-2xl bg-slate-100 px-4 py-2.5 text-base text-ink"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gửi tin nhắn"
                accessibilityState={{ disabled: !content || send.isPending }}
                disabled={!content || send.isPending}
                onPress={submit}
                className={cn(
                  "h-11 w-11 items-center justify-center rounded-full bg-teal",
                  (!content || send.isPending) && "opacity-40",
                )}
              >
                {send.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Send color="#ffffff" size={18} />
                )}
              </Pressable>
            </View>
          )}
          <FormError message={send.error?.message} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
