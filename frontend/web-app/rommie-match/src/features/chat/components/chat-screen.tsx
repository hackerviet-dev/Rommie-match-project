import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AppShell } from "@/layouts/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState, Pagination } from "@/components/common/query-state";
import { useAuthStore } from "@/features/auth";
import { chatApi } from "../services/chat-api";
import { useChatRealtime } from "../hooks/use-chat-realtime";
export function ChatScreen() {
  const [params, setParams] = useSearchParams(),
    id = params.get("conversation") ?? "",
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
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
  const end = useRef<HTMLDivElement>(null);
  const lastMessageId = rows.at(-1)?.id;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [id, lastMessageId]);
  const draft = drafts[id] ?? "";
  const submit = () => {
    if (draft.trim() && !send.isPending && !active.data?.isBlocked)
      send.mutate({ conversationId: id, content: draft.trim() });
  };
  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Tin nhắn</h1>
        <span className="text-xs text-muted-foreground">{state}</span>
      </div>
      <div className="mt-5 grid min-h-[65vh] gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className={`${id ? "hidden md:block" : ""} rounded-2xl border bg-card p-4`}
        >
          <Input
            aria-label="Tìm hội thoại"
            placeholder="Tìm hội thoại…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <QueryState query={list} />
          {list.data?.items
            .filter((c) =>
              c.partner.displayName
                .toLocaleLowerCase()
                .includes(search.toLocaleLowerCase()),
            )
            .map((c) => (
              <button
                key={c.id}
                onClick={() => setParams({ conversation: c.id })}
                className={`mt-3 w-full rounded-xl p-3 text-left ${c.id === id ? "bg-mint/30" : "hover:bg-muted"}`}
              >
                <strong className="text-sm">{c.partner.displayName}</strong>
                {c.unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-teal px-2 text-xs text-white">
                    {c.unreadCount}
                  </span>
                )}
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {c.lastMessage?.content ?? "Chưa có tin nhắn"}
                </p>
              </button>
            ))}
          {list.data?.totalCount === 0 && (
            <p className="py-8 text-sm text-muted-foreground">
              Chưa có hội thoại. Mở một hồ sơ và chọn Nhắn tin.
            </p>
          )}
          {list.data && (
            <Pagination
              page={page}
              hasNext={list.data.hasNextPage}
              onChange={setPage}
            />
          )}
        </aside>
        <section
          className={`${!id ? "hidden md:flex" : "flex"} min-w-0 flex-col rounded-2xl border bg-card`}
        >
          {!id ? (
            <p className="p-8 text-muted-foreground">
              Chọn hội thoại để bắt đầu.
            </p>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b p-4">
                <Button
                  variant="ghost"
                  className="md:hidden"
                  onClick={() => setParams({})}
                >
                  ←
                </Button>
                <div className="flex-1">
                  <h2 className="font-semibold">
                    {active.data?.partner.displayName ?? "Hội thoại"}
                  </h2>
                  {active.data && (
                    <Link
                      className="text-xs text-teal"
                      to={`/profile/${active.data.partner.userId}`}
                    >
                      Xem hồ sơ
                    </Link>
                  )}
                </div>
              </header>
              <div className="h-[50vh] overflow-y-auto p-4">
                <QueryState query={active} />
                <QueryState query={messages} />
                {messages.hasNextPage && (
                  <Button
                    variant="outline"
                    disabled={messages.isFetchingNextPage}
                    onClick={() => void messages.fetchNextPage()}
                  >
                    Tin nhắn trước đó
                  </Button>
                )}
                {rows.map((m) => (
                  <div
                    key={m.id}
                    className={`my-3 flex ${m.senderId === me ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[85%]">
                      <p
                        className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm ${m.senderId === me ? "bg-navy text-white" : "bg-muted"}`}
                      >
                        {m.content}
                      </p>
                      <p className="mt-1 text-right text-[10px] text-muted-foreground">
                        {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {m.senderId === me && m.readAt ? " · Đã đọc" : ""}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={end} />
              </div>
              <footer className="border-t p-4">
                {active.data?.isBlocked && (
                  <p role="status" className="mb-3 text-sm text-destructive">
                    Hội thoại bị chặn. Bạn vẫn có thể đọc lịch sử.
                  </p>
                )}
                {read.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    Không thể đánh dấu đã đọc: {read.error.message}
                  </p>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                  className="flex gap-3"
                >
                  <textarea
                    aria-label="Nhập tin nhắn"
                    placeholder="Viết tin nhắn…"
                    className="min-w-0 flex-1 rounded-xl border p-3 text-sm"
                    maxLength={2000}
                    rows={2}
                    disabled={
                      !active.data || active.data.isBlocked || send.isPending
                    }
                    value={draft}
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
                  />
                  <Button
                    type="submit"
                    disabled={
                      !draft.trim() ||
                      send.isPending ||
                      !active.data ||
                      active.data.isBlocked
                    }
                  >
                    Gửi
                  </Button>
                </form>
                {send.isError && (
                  <p role="alert" className="mt-2 text-destructive">
                    {send.error.message}
                  </p>
                )}
              </footer>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
