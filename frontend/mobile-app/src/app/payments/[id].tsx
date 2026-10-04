import { useLocalSearchParams } from "expo-router";
import { PaymentScreen } from "@/features/billing/components/payment-screen";

export default function PaymentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PaymentScreen key={id} id={id ?? ""} />;
}
