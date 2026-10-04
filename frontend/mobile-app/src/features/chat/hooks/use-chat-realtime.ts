import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { create } from "zustand";
import { useAuthStore } from "@/features/auth";
import { API_BASE_URL } from "@/services/api-client";
import { tokenStorage } from "@/services/token-storage";

type RealtimeStatus = "connecting" | "live" | "polling";
export const useChatStatus = create<{ status: RealtimeStatus }>(() => ({ status: "connecting" }));
export const CHAT_STATUS_LABEL: Record<RealtimeStatus, string> = {
  connecting: "Đang kết nối…",
  live: "Trực tiếp",
  polling: "Đồng bộ định kỳ",
};

// Kết nối SignalR /hubs/chat cho cả app (gắn một lần trong _layout), giống useChatRealtime của
// web: có sự kiện thì tải lại các query "chat". Mất kết nối thì thử lại sau 5 giây; trong lúc
// đó danh sách vẫn tự tải lại mỗi 15 giây.
export function useChatRealtime(enabled: boolean) {
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  useEffect(() => {
    if (!enabled || !userId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const setStatus = (status: RealtimeStatus) => {
      if (!disposed) useChatStatus.setState({ status });
    };
    const hub = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/chat`, {
        accessTokenFactory: () => tokenStorage.getAccessToken() ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();
    const refresh = () => void client.invalidateQueries({ queryKey: ["chat"] });
    hub.on("MessageReceived", refresh);
    hub.on("ConversationRead", refresh);
    hub.onreconnecting(() => setStatus("connecting"));
    hub.onreconnected(() => {
      setStatus("live");
      refresh();
    });
    const start = async () => {
      try {
        await hub.start();
        setStatus("live");
        refresh();
      } catch {
        setStatus("polling");
        if (!disposed) timer = setTimeout(() => void start(), 5000);
      }
    };
    hub.onclose(() => {
      setStatus("polling");
      if (!disposed) timer = setTimeout(() => void start(), 5000);
    });
    setStatus("connecting");
    void start();
    return () => {
      disposed = true;
      clearTimeout(timer);
      void hub.stop();
    };
  }, [client, userId, enabled]);
}
