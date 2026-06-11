const socketUrl = process.env.GO_CHAT_WS_URL ?? 'ws://localhost:8081/ws';

export function connectChatSocket() {
  return new WebSocket(socketUrl);
}
