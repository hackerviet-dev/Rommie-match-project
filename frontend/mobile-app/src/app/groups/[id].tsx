import { useLocalSearchParams } from "expo-router";
import { GroupScreen } from "@/features/workspaces/components/group-screen";

export default function GroupRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GroupScreen key={id} id={id ?? ""} />;
}
