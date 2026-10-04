import { ScreenShell } from "@/components/screen-shell";
import { ServicesScreen } from "@/features/hyperlocal/components/services-screen";

export default function ServicesRoute() {
  return (
    <ScreenShell title="Dịch vụ" scroll={false}>
      <ServicesScreen />
    </ScreenShell>
  );
}
