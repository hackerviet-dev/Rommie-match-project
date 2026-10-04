import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

// Header cho các màn mở chồng lên tab (hồ sơ, đã lưu, đề nghị…).
export function StackHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={goBack}
        className="h-10 w-10 items-center justify-center rounded-full bg-white"
      >
        <ArrowLeft color={colors.navy} size={20} />
      </Pressable>
      <Text className="flex-1 text-center text-base font-bold text-navy" numberOfLines={1}>
        {title}
      </Text>
      <View className="min-w-10 items-end">{right}</View>
    </View>
  );
}

type TabHref = "/" | "/matches" | "/rooms" | "/chat" | "/services" | "/premium";

// Về một tab từ bất kỳ màn nào. router.navigate từ màn chồng lên tab (hồ sơ, giao dịch…)
// sẽ đẩy thêm cả bộ tab mới vào stack; dismissTo đóng các màn đó để quay về đúng tab cũ.
export function goToTab(href: TabHref) {
  if (router.canDismiss()) router.dismissTo(href);
  else router.navigate(href);
}
