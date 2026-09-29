import type { OutgoingChatMessage } from "../types/chat-types";

const CHAT_URL = import.meta.env.VITE_CHAT_URL ?? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;

export function createChatSocket(onMessage: (message: OutgoingChatMessage) => void) {
  const socket = new WebSocket(CHAT_URL);
  socket.addEventListener("message", (event) => {
    try {
      onMessage(JSON.parse(String(event.data)) as OutgoingChatMessage);
    } catch {
      // The server may emit non-JSON operational messages in the future.
    }
  });
  return socket;
}
