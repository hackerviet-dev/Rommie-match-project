import { Text, View } from "react-native";
import { LogoMark } from "./logo-mark";

export function BrandHeader() {
  return (
    <View className="flex-row items-center gap-3">
      <LogoMark />
      <Text className="text-xl font-bold text-navy">
        Roomie<Text className="text-teal">Match</Text>
      </Text>
    </View>
  );
}
