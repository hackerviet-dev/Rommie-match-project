import { useLocalSearchParams } from "expo-router";
import { ProfileScreen } from "@/features/profile/components/profile-screen";

export default function ProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProfileScreen key={id} id={id ?? ""} />;
}
