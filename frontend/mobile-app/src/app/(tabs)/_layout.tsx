import { Tabs } from "expo-router/tabs";
import { BottomTabs } from "@/components/bottom-tabs";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BottomTabs {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="services" />
      <Tabs.Screen name="premium" />
    </Tabs>
  );
}
