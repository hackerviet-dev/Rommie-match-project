import { ScreenShell } from "@/components/screen-shell";
import { RoomsScreen } from "@/features/rooms/components/rooms-screen";

export default function RoomsRoute() {
  return (
    <ScreenShell title="Tìm phòng" scroll={false}>
      <RoomsScreen />
    </ScreenShell>
  );
}
