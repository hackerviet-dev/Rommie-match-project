import { ScreenShell } from "@/components/screen-shell";
import { ChatListScreen } from "@/features/chat/components/chat-list-screen";

export default function ChatRoute() {
  return (
    <ScreenShell title="Tin nhắn" scroll={false}>
      <ChatListScreen />
    </ScreenShell>
  );
}
