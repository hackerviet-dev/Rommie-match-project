import { useLocalSearchParams } from "expo-router";
import { BookingDetailScreen } from "@/features/hyperlocal/components/booking-detail-screen";

export default function BookingDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BookingDetailScreen key={id} id={id ?? ""} />;
}
