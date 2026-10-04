import "../../global.css";

import { Stack } from "expo-router";
import App from "@/App";

export default function RootLayout() {
  return (
    <App>
      <Stack screenOptions={{ headerShown: false }} />
    </App>
  );
}
