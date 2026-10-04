import { Bell } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogoMark } from "@/components/logo-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { colors } from "@/theme/colors";

// Khung chung của các tab: header thương hiệu + nội dung cuộn.
export function ScreenShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right"]}>
      <View className="flex-1 px-4 pt-2">
        <View className="mb-5 flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            <LogoMark />
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-teal">
                RoomieMatch
              </Text>
              <Text className="mt-0.5 text-2xl font-bold text-ink" numberOfLines={1}>
                {title}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white">
              <Bell color={colors.navy} size={19} />
            </Pressable>
            <Avatar size="sm" className="border-2 border-mint bg-mint/30">
              <AvatarFallback className="text-sm text-navy">ME</AvatarFallback>
            </Avatar>
          </View>
        </View>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 22 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
