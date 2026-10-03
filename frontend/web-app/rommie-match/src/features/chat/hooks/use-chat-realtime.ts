import { useEffect, useState } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStorage } from "@/services/token-storage";
import { useAuthStore } from "@/features/auth";
export function useChatRealtime() {
  const client = useQueryClient(),
    userId = useAuthStore((s) => s.user?.id),
    [state, setState] = useState("Đang kết nối…");
  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const hub = new HubConnectionBuilder()
      .withUrl("/hubs/chat", {
        accessTokenFactory: () => tokenStorage.getAccessToken() ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();
    const refresh = () => void client.invalidateQueries({ queryKey: ["chat"] });
    hub.on("MessageReceived", refresh);
    hub.on("ConversationRead", refresh);
    hub.onreconnecting(() => {
      if (!disposed) setState("Đang kết nối lại…");
    });
    hub.onreconnected(() => {
      if (!disposed) {
        setState("Đã kết nối trực tiếp");
        refresh();
      }
    });
    const start = async () => {
      try {
        await hub.start();
        if (!disposed) {
          setState("Đã kết nối trực tiếp");
          refresh();
        }
      } catch {
        if (!disposed) {
          setState("Đang đồng bộ định kỳ; thử kết nối lại…");
          timer = setTimeout(() => void start(), 5000);
        }
      }
    };
    hub.onclose(() => {
      if (!disposed) {
        setState("Đang đồng bộ định kỳ");
        timer = setTimeout(() => void start(), 5000);
      }
    });
    void start();
    return () => {
      disposed = true;
      clearTimeout(timer);
      void hub.stop();
    };
  }, [client, userId]);
  return state;
}
