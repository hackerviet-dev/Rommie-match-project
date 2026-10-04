import { useLocalSearchParams } from "expo-router";
import { RoomEditorScreen } from "@/features/rooms/components/room-editor-screen";

export default function EditRoomRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RoomEditorScreen key={id} id={id} />;
}
