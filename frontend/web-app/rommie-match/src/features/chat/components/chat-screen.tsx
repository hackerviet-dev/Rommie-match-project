import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  MessageCircle,
  Paperclip,
  Phone,
  Search,
  Send,
  Video,
} from "lucide-react";
import { AppShell, Logo } from "@/layouts/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState } from "@/components/common/query-state";
import { useAuthStore } from "@/features/auth";
import { chatApi } from "../services/chat-api";
import { useChatRealtime } from "../hooks/use-chat-realtime";
import { ChatContactPanel } from "./chat-contact-panel";
export function ChatScreen() {
  const [params, setParams] = useSearchParams(),
    id = params.get("conversation") ?? "",
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [isUnreadOnly, setIsUnreadOnly] = useState(false),
    [isInfoOpen, setIsInfoOpen] = useState(false),
    [drafts, setDrafts] = useState<Record<string, string>>({});
  const me = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    state = useChatRealtime(),
    list = useQuery({
      queryKey: ["chat", "conversations", me, page],
      queryFn: () => chatApi.list(page),
      refetchInterval: 15000,
    });
  const active = useQuery({
    queryKey: ["chat", "conversation", me, id],
    queryFn: () => chatApi.get(id),
    enabled: Boolean(id),
    refetchInterval: 15000,
  });
  const messages = useInfiniteQuery({
    queryKey: ["chat", "messages", me, id],
    queryFn: ({ pageParam }) => chatApi.messages(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.hasMore ? last.items.at(-1)?.id : undefined,
    enabled: Boolean(id),
    refetchInterval: 15000,
  });
  const read = useMutation({
    mutationFn: chatApi.read,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["chat", "conversations"] }),
  });
  const send = useMutation({
    mutationFn: ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => chatApi.send(conversationId, content),
    onSuccess: (_, vars) => {
      setDrafts((d) => ({ ...d, [vars.conversationId]: "" }));
      void client.invalidateQueries({ queryKey: ["chat"] });
    },
  });
  const unread = active.data?.unreadCount ?? 0;
  const markRead = read.mutate;
  useEffect(() => {
    if (id && unread > 0) markRead(id);
  }, [id, unread, markRead]);
  const rows = [
    ...new Map(
      (messages.data?.pages.flatMap((p) => p.items) ?? []).map((m) => [
        m.id,
        m,
      ]),
    ).values(),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const messagesRef = useRef<HTMLDivElement>(null);
  const lastMessageId = rows.at(-1)?.id;
  useEffect(() => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [id, lastMessageId]);
  const draft = drafts[id] ?? "";
  const submit = () => {
    if (draft.trim() && !send.isPending && !active.data?.isBlocked)
      send.mutate({ conversationId: id, content: draft.trim() });
  };
  const visible =
    list.data?.items.filter(
      (c) =>
        (!isUnreadOnly || c.unreadCount > 0) &&
        c.partner.displayName
          .toLocaleLowerCase("vi")
          .includes(search.trim().toLocaleLowerCase("vi")),
    ) ?? [];
  const partner = active.isError ? undefined : active.data?.partner;
  return (
    <AppShell fullHeight hideHeader>
      <div className="relative mx-auto grid h-full min-h-0 max-w-[1600px] bg-white md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_260px]">
        <aside
          className={`${id ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-border/70`}
        >
          <div className="px-5 pb-4 pt-5">
            <Logo className="mb-6 w-fit rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal" />
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl font-display font-bold">Tin nhắn</h1>
              <span
                title={state}
                className="rounded-full bg-mint/25 px-2.5 py-1 text-[10px] font-medium text-teal"
              >
                {state === "Đã kết nối trực tiếp"
                  ? "Trực tiếp"
                  : "Đang kết nối"}
              </span>
            </div>
            <div className="relative mt-5">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Tìm hội thoại"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm người trò chuyện"
                className="h-10 rounded-xl border-0 bg-muted/70 pl-9 shadow-none"
              />
            </div>
            <div className="mt-4 flex gap-2">
              {[
                { label: "Tất cả", value: false },
                { label: "Chưa đọc", value: true },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => setIsUnreadOnly(item.value)}
                  aria-pressed={isUnreadOnly === item.value}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${isUnreadOnly === item.value ? "bg-mint/30 text-navy" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            <QueryState query={list} />
            {visible.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setParams({ conversation: c.id });
                  setIsInfoOpen(false);
                }}
                aria-current={c.id === id ? "true" : undefined}
                className={`my-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${c.id === id ? "bg-mint/20" : "hover:bg-muted/50"}`}
              >
                {c.partner.avatarUrl ? (
                  <img
                    src={c.partner.avatarUrl}
                    alt={c.partner.displayName}
                    className="h-12 w-12 shrink-0 rounded-full bg-mint/25"
                  />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mint/25 text-sm font-semibold">
                    {c.partner.displayName.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {c.partner.displayName}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {c.lastMessage
                        ? new Date(c.lastMessage.createdAt).toLocaleTimeString(
                            "vi-VN",
                            { hour: "2-digit", minute: "2-digit" },
                          )
                        : ""}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {c.lastMessage?.content ?? "Chưa có tin nhắn"}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-teal px-1 text-[9px] font-semibold text-white">
                    {c.unreadCount}
                  </span>
                )}
              </button>
            ))}
            {list.data && !visible.length && (
              <div className="px-4 py-10 text-center">
                <MessageCircle className="mx-auto h-8 w-8 text-teal/60" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {list.data.totalCount === 0
                    ? "Bạn chưa có hội thoại. Chọn một hồ sơ để bắt đầu kết nối."
                    : "Không có hội thoại phù hợp trên trang này."}
                </p>
                {list.data.totalCount === 0 && (
                  <Button asChild variant="outline" className="mt-4 rounded-xl">
                    <Link to="/matches">Tìm người ở ghép</Link>
                  </Button>
                )}
              </div>
            )}
          </div>
          {list.data && (list.data.hasNextPage || page > 1) && (
            <div className="flex items-center justify-between gap-2 border-t px-4 py-2">
              <Button
                aria-label="Trang hội thoại trước"
                variant="ghost"
                size="icon"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                Trang {page}
              </span>
              <Button
                aria-label="Trang hội thoại sau"
                variant="ghost"
                size="icon"
                disabled={!list.data.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p
            role="status"
            className="border-t px-5 py-3 text-[11px] text-muted-foreground"
          >
            {state}
          </p>
        </aside>
        <section
          aria-label={
            partner
              ? `Trò chuyện với ${partner.displayName}`
              : "Nội dung hội thoại"
          }
          className={`${id ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col`}
        >
          {!id ? (
            <div className="flex h-full flex-col items-center justify-center bg-background/40 p-8 text-center">
              <div className="grid h-24 w-24 place-items-center rounded-3xl bg-mint/25">
                <MessageCircle className="h-12 w-12 text-teal" />
              </div>
              <h2 className="mt-6 text-2xl font-display font-bold">
                Bắt đầu một cuộc trò chuyện
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Chọn hội thoại bên trái hoặc tìm người phù hợp để cùng trao đổi
                về nơi ở và thói quen sinh hoạt.
              </p>
              <Button asChild className="mt-6 rounded-xl">
                <Link to="/matches">Khám phá người ở ghép</Link>
              </Button>
            </div>
          ) : (
            <>
              <header className="flex min-h-20 shrink-0 items-center gap-3 border-b border-border/60 px-4 lg:px-6">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Quay lại danh sách tin nhắn"
                  className="h-9 w-9 md:hidden"
                  onClick={() => {
                    setParams({});
                    setIsInfoOpen(false);
                  }}
                >
                  <ArrowLeft />
                </Button>
                {partner?.avatarUrl && (
                  <img
                    src={partner.avatarUrl}
                    alt={partner.displayName}
                    className="h-10 w-10 rounded-full bg-mint/25"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">
                    {partner?.displayName ?? "Hội thoại"}
                  </h2>
                  {partner && (
                    <Link
                      to={`/profile/${partner.userId}`}
                      className="mt-0.5 text-xs text-teal hover:underline"
                    >
                      Xem hồ sơ
                    </Link>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  aria-label="Gọi điện · Sắp có"
                  title="Gọi điện · Sắp có"
                  className="hidden h-9 w-9 sm:inline-flex"
                >
                  <Phone />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  aria-label="Gọi video · Sắp có"
                  title="Gọi video · Sắp có"
                  className="hidden h-9 w-9 sm:inline-flex"
                >
                  <Video />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Thông tin hội thoại"
                  aria-expanded={isInfoOpen}
                  disabled={!partner}
                  onClick={() => setIsInfoOpen((value) => !value)}
                  className="h-9 w-9 xl:hidden"
                >
                  <Info />
                </Button>
              </header>
              <div
                ref={messagesRef}
                className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-4 py-6 sm:px-6"
              >
                <QueryState query={active} />
                <QueryState query={messages} />
                {partner && (
                  <div className="mb-7 text-center">
                    {partner.avatarUrl && (
                      <img
                        src={partner.avatarUrl}
                        alt=""
                        className="mx-auto h-16 w-16 rounded-full bg-mint/20"
                      />
                    )}
                    <p className="mt-3 font-semibold">{partner.displayName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bắt đầu bằng một lời chào, tìm hiểu cách sống của nhau.
                    </p>
                  </div>
                )}
                {messages.hasNextPage && (
                  <div className="mb-5 text-center">
                    <Button
                      variant="outline"
                      className="rounded-full text-xs"
                      disabled={messages.isFetchingNextPage}
                      onClick={() => void messages.fetchNextPage()}
                    >
                      Tin nhắn trước đó
                    </Button>
                  </div>
                )}
                <div className="space-y-4">
                  {rows.map((m) => (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${m.senderId === me ? "justify-end" : "justify-start"}`}
                    >
                      {m.senderId !== me && partner?.avatarUrl && (
                        <img
                          src={partner.avatarUrl}
                          alt=""
                          className="h-7 w-7 shrink-0 rounded-full bg-mint/25"
                        />
                      )}
                      <div className="max-w-[85%] sm:max-w-[72%]">
                        <p
                          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.senderId === me ? "rounded-br-md bg-navy text-white" : "rounded-bl-md bg-white text-foreground shadow-sm"}`}
                        >
                          {m.content}
                        </p>
                        <p
                          className={`mt-1 px-1 text-[10px] text-muted-foreground ${m.senderId === me ? "text-right" : ""}`}
                        >
                          {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {m.senderId === me && m.readAt ? " · Đã đọc" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {messages.isSuccess && !rows.length && (
                  <div className="mx-auto mt-12 max-w-xs text-center">
                    <MessageCircle className="mx-auto h-8 w-8 text-teal" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      Gửi một lời chào để bắt đầu cuộc trò chuyện.
                    </p>
                  </div>
                )}
              </div>
              <footer className="shrink-0 border-t border-border/60 bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
                {active.data?.isBlocked && (
                  <p role="status" className="mb-3 text-sm text-destructive">
                    Hội thoại bị chặn. Bạn vẫn có thể đọc lịch sử.
                  </p>
                )}
                {read.isError && (
                  <p role="alert" className="mb-2 text-sm text-destructive">
                    Không thể đánh dấu đã đọc: {read.error.message}
                  </p>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                  className="flex items-end gap-2"
                >
                  <Button
                    type="button"
                    disabled
                    variant="ghost"
                    size="icon"
                    aria-label="Đính kèm · Sắp có"
                    title="Đính kèm · Sắp có"
                    className="h-10 w-10 shrink-0"
                  >
                    <Paperclip />
                  </Button>
                  <textarea
                    aria-label="Nhập tin nhắn"
                    rows={1}
                    maxLength={2000}
                    value={draft}
                    disabled={
                      !partner || active.data?.isBlocked || send.isPending
                    }
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    placeholder="Viết tin nhắn…"
                    className="max-h-32 min-h-11 min-w-0 flex-1 resize-y rounded-2xl border-0 bg-muted/60 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    aria-label="Gửi tin nhắn"
                    disabled={
                      !draft.trim() ||
                      send.isPending ||
                      !partner ||
                      active.data?.isBlocked
                    }
                    className="h-10 w-10 shrink-0 rounded-full bg-teal text-white hover:bg-teal/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                {send.isError && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {send.error.message}
                  </p>
                )}
              </footer>
            </>
          )}
        </section>
        <ChatContactPanel
          conversation={active.isError ? undefined : active.data}
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
        />
      </div>
    </AppShell>
  );
}
