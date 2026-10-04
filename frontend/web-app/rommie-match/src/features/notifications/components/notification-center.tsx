import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { useAuthStore } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { QueryState, Pagination } from "@/components/common/query-state";
import { notificationsApi, type ActivityNotification } from "../services/notifications-api";

function useNotifications(page: number, unreadOnly: boolean, compact: boolean) {
  const me = useAuthStore(s => s.user?.id);
  const cache = useQueryClient();
  const key = ["notifications", me];
  const list = useQuery({ queryKey: [...key, "list", page, unreadOnly, compact], queryFn: () => notificationsApi.list(page, unreadOnly, compact ? 5 : 20), enabled: Boolean(me), refetchInterval: 10000 });
  const unread = useQuery({ queryKey: [...key, "count"], queryFn: notificationsApi.unread, enabled: Boolean(me), refetchInterval: 10000 });
  const read = useMutation({ mutationFn: notificationsApi.read, onSuccess: () => cache.invalidateQueries({ queryKey: key }) });
  const readAll = useMutation({ mutationFn: notificationsApi.readAll, onSuccess: () => cache.invalidateQueries({ queryKey: key }) });
  return { list, unread, read, readAll };
}

function NotificationList({ compact = false }: { compact?: boolean }) {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { list, unread, read, readAll } = useNotifications(page, unreadOnly, compact);
  const navigate = useNavigate();
  function open(item: ActivityNotification) {
    // Only follow internal paths produced by the server.
    const url = item.data.url;
    const valid = url?.startsWith("/") && !url.startsWith("//") && !url.includes("\\");
    if (item.readAt) { if (valid) navigate(url!); }
    else read.mutate(item.id, { onSuccess: () => { if (valid) navigate(url!); } });
  }
  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">Thông báo {unread.data ? `(${unread.data.count} chưa đọc)` : ""}</h2>
      <Button variant="ghost" size="sm" disabled={!unread.data?.count || readAll.isPending} onClick={() => readAll.mutate()}><CheckCheck className="h-4 w-4" />Đọc tất cả</Button>
    </div>
    {!compact && <div className="mb-4 flex gap-2">{[false, true].map(value => <Button key={String(value)} size="sm" variant={unreadOnly === value ? "default" : "outline"} onClick={() => { setUnreadOnly(value); setPage(1); }}>{value ? "Chưa đọc" : "Tất cả"}</Button>)}</div>}
    <QueryState query={list} />
    {(read.error || readAll.error) && <p role="alert" className="mb-3 text-sm text-destructive">{(read.error || readAll.error)?.message}</p>}
    {list.data?.totalCount === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{unreadOnly ? "Bạn đã đọc hết thông báo." : "Chưa có thông báo. Các cập nhật mới sẽ xuất hiện ở đây."}</p>}
    <div className="space-y-2">{list.data?.items.map(item => <button key={item.id} disabled={read.isPending} onClick={() => open(item)} className={`w-full rounded-xl border p-3 text-left ${item.readAt ? "bg-white" : "border-teal/20 bg-mint/20"}`}>
      <p className="flex items-start gap-2 text-sm font-semibold">{!item.readAt && <span aria-label="Chưa đọc" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal" />}{item.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
      <p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("vi-VN")} · {item.readAt ? "Đã đọc" : "Chưa đọc"}</p>
    </button>)}</div>
    {!compact && list.data && <Pagination page={page} hasNext={list.data.hasNextPage} onChange={setPage} />}
    {compact && <Link to="/notifications" className="mt-4 block text-center text-sm text-teal">Xem lịch sử thông báo</Link>}
  </div>;
}

export function NotificationBell() {
  const me = useAuthStore(s => s.user?.id);
  const unread = useQuery({ queryKey: ["notifications", me, "count"], queryFn: notificationsApi.unread, enabled: Boolean(me), refetchInterval: 10000 });
  return <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Thông báo" className="relative shrink-0 rounded-full"><Bell className="h-5 w-5" />{Boolean(unread.data?.count) && <span className="absolute -right-1 -top-1 rounded-full bg-teal px-1.5 text-xs text-white">{unread.data!.count > 99 ? "99+" : unread.data!.count}</span>}</Button></PopoverTrigger>
    <PopoverContent align="end" className="max-h-[min(600px,80dvh)] w-[min(380px,calc(100vw-2rem))] overflow-y-auto rounded-2xl p-4"><NotificationList compact /></PopoverContent>
  </Popover>;
}
export function NotificationCenter() { return <section className="mx-auto max-w-3xl"><h1 className="mb-6 font-display text-2xl font-bold">Lịch sử thông báo</h1><div className="rounded-2xl border bg-white p-5"><NotificationList /></div></section>; }
