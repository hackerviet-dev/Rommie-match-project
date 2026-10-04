import { router } from "expo-router";
import { ArrowLeft, LogOut, MonitorSmartphone } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { FormScreen } from "@/components/form-screen";
import { UserAvatar } from "@/components/user-avatar";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-field";
import { useAuthStore, useSignOut } from "@/features/auth";
import { colors } from "@/theme/colors";

export default function AccountScreen() {
  const user = useAuthStore((state) => state.user);
  const signOut = useSignOut();
  if (!user) return null;
  const location = [user.district, user.city].filter(Boolean).join(", ");

  return (
    <FormScreen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        className="h-10 w-10 items-center justify-center rounded-full bg-white"
      >
        <ArrowLeft color={colors.navy} size={20} />
      </Pressable>

      <View className="mt-6 items-center">
        <UserAvatar
          size="lg"
          name={user.displayName}
          avatarUrl={user.avatarUrl}
          className="border-2 border-mint"
          textClassName="text-xl"
        />
        <Text className="mt-3 text-2xl font-bold text-ink">{user.displayName}</Text>
        <Text className="mt-1 text-sm text-slate-500">{user.email}</Text>
        {location ? <Text className="mt-1 text-sm text-slate-500">{location}</Text> : null}
      </View>

      <Card className="mt-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-ink">Hoàn thiện hồ sơ</Text>
          <Text className="font-bold text-teal">{user.profileCompletion}%</Text>
        </View>
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <View
            className="h-full rounded-full bg-teal"
            style={{ width: `${Math.min(100, Math.max(0, user.profileCompletion))}%` }}
          />
        </View>
      </Card>

      <View className="mt-6 gap-3">
        <FormError
          message={
            signOut.isError
              ? "Đã đăng xuất trên máy này. Chưa thể xác nhận thu hồi phiên trên máy chủ."
              : null
          }
        />
        <Button
          action="primary"
          variant="outline"
          className="h-12"
          disabled={signOut.isPending}
          onPress={() => signOut.mutate(false)}
        >
          <ButtonIcon as={LogOut} />
          <ButtonText>Đăng xuất</ButtonText>
        </Button>
        <Button
          action="muted"
          variant="outline"
          className="h-12"
          disabled={signOut.isPending}
          onPress={() => signOut.mutate(true)}
        >
          <ButtonIcon as={MonitorSmartphone} />
          <ButtonText>Đăng xuất trên mọi thiết bị</ButtonText>
        </Button>
      </View>
    </FormScreen>
  );
}
