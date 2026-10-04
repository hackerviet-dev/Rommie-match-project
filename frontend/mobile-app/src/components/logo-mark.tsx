import { Heart, Home } from "lucide-react-native";
import { View } from "react-native";
import { colors } from "@/theme/colors";

export function LogoMark() {
  return (
    <View className="h-10 w-10 items-center justify-center rounded-2xl bg-mint/40">
      <Home color={colors.navy} fill={colors.mint} size={22} strokeWidth={2.4} />
      <Heart color={colors.teal} fill={colors.teal} size={9} style={{ position: "absolute" }} />
    </View>
  );
}
