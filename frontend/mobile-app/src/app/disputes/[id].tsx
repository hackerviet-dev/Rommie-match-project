import { useLocalSearchParams } from "expo-router";
import { DisputeScreen } from "@/features/workspaces/components/dispute-screen";

export default function DisputeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DisputeScreen key={id} id={id ?? ""} />;
}
