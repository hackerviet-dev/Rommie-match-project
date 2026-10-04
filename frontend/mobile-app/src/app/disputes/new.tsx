import { useLocalSearchParams } from "expo-router";
import { NewDisputeScreen } from "@/features/workspaces/components/new-dispute-screen";

export default function NewDisputeRoute() {
  const { respondent, group } = useLocalSearchParams<{ respondent?: string; group?: string }>();
  return <NewDisputeScreen respondent={respondent} group={group} />;
}
