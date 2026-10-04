import { router } from "expo-router";
import { ScreenShell } from "@/components/screen-shell";
import { HomeScreen } from "@/features/dashboard/home-screen";

export default function HomeRoute() {
  return (
    <ScreenShell title="Trang chính">
      <HomeScreen onOpenMatches={() => router.navigate("/matches")} />
    </ScreenShell>
  );
}
