import { useNotifications } from "../hooks/use-notifications";

export function RoomNotificationBadge() {
  const { query } = useNotifications();
  const count = query.isError ? 0 : (query.data?.unreadRoomCount ?? 0);
  return count > 0 ? <span aria-label={`${count} kết quả duyệt chưa đọc`} className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">{count > 99 ? "99+" : count}</span> : null;
}
