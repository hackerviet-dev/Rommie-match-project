import type { BottomTabBarProps } from "expo-router/tabs";
import { Heart, House, type LucideIcon, MessageCircle, Sparkles, Store } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";

// Cùng thứ tự với menu của web. Trang chính (index) không nằm trên thanh tab: mở bằng logo.
const tabs: Record<string, { icon: LucideIcon; label: string }> = {
  matches: { icon: Heart, label: "Ở ghép" },
  rooms: { icon: House, label: "Tìm phòng" },
  chat: { icon: MessageCircle, label: "Tin nhắn" },
  services: { icon: Store, label: "Dịch vụ" },
  premium: { icon: Sparkles, label: "Premium" },
};

export function BottomTabs({ state, navigation }: BottomTabBarProps) {
  return (
    <SafeAreaView className="bg-paper px-4 pb-2" edges={["bottom", "left", "right"]}>
      <View className="mt-2 flex-row rounded-3xl border border-slate-100 bg-white p-1.5">
        {state.routes.map((route, index) => {
          const tab = tabs[route.name];
          if (!tab) return null;
          const Icon = tab.icon;
          const active = state.index === index;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={cn(
                "h-14 flex-1 items-center justify-center gap-1 rounded-2xl",
                active && "bg-mint/30",
              )}
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            >
              <Icon
                color={active ? colors.teal : colors.slate500}
                fill={active && route.name === "matches" ? colors.mint : "transparent"}
                size={19}
                strokeWidth={2.3}
              />
              <Text
                className={cn("text-[10px] font-semibold", active ? "text-teal" : "text-slate-500")}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
