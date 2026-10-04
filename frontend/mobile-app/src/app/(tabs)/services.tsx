import { ScreenShell } from "@/components/screen-shell";
import { ServicesScreen } from "@/features/hyperlocal/services-screen";

export default function ServicesRoute() {
  return (
    <ScreenShell title="Dịch vụ">
      <ServicesScreen />
    </ScreenShell>
  );
}
