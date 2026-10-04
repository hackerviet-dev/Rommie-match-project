import { useLocalSearchParams } from "expo-router";
import { ServiceDetailScreen } from "@/features/hyperlocal/components/service-detail-screen";

export default function ServiceDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ServiceDetailScreen key={id} id={id ?? ""} />;
}
