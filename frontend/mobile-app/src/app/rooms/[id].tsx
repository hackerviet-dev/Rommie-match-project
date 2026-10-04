import { useLocalSearchParams } from "expo-router";
import { RoomDetailScreen } from "@/features/rooms/components/room-detail-screen";

export default function RoomDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RoomDetailScreen key={id} id={id ?? ""} />;
}
