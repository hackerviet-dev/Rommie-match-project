import { ScreenShell } from "@/components/screen-shell";
import { PremiumScreen } from "@/features/billing/components/premium-screen";

export default function PremiumRoute() {
  return (
    <ScreenShell title="Premium">
      <PremiumScreen />
    </ScreenShell>
  );
}
