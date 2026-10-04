import { ScreenShell } from "@/components/screen-shell";
import { ChatListScreen } from "@/features/chat/chat-list-screen";

export default function ChatRoute() {
  return (
    <ScreenShell title="Tin nhắn">
      <ChatListScreen />
    </ScreenShell>
  );
}
