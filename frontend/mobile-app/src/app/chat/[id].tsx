import { useLocalSearchParams } from "expo-router";
import { ConversationScreen } from "@/features/chat/components/conversation-screen";

export default function ConversationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ConversationScreen key={id} id={id ?? ""} />;
}
