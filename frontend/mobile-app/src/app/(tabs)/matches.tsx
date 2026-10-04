import { ScreenShell } from "@/components/screen-shell";
import { MatchesScreen } from "@/features/matching/components/matches-screen";

export default function MatchesRoute() {
  return (
    <ScreenShell title="Ghép đôi" scroll={false}>
      <MatchesScreen />
    </ScreenShell>
  );
}
