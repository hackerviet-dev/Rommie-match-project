import "../../global.css";

import { Stack } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import App from "@/App";
import { LogoMark } from "@/components/logo-mark";
import { Button, ButtonText } from "@/components/ui/button";
import { isStaffRole, useAuthSession, useAuthStore } from "@/features/auth";
import { colors } from "@/theme/colors";

export default function RootLayout() {
  return (
    <App>
      <RootNavigator />
    </App>
  );
}

// Thay cho AuthGuard/ActorEntry của web: mỗi nhóm route chỉ tồn tại khi guard đúng, nên
// đăng nhập/đăng xuất tự chuyển màn hình. Tài khoản admin/moderator chỉ dùng web.
function RootNavigator() {
  const { bootError, retry, skip } = useAuthSession();
  const { user, isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) return <BootScreen error={bootError} onRetry={retry} onSkip={skip} />;

  const isStaff = isAuthenticated && isStaffRole(user?.role);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && !isStaff}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="account" />
      </Stack.Protected>
      <Stack.Protected guard={isStaff}>
        <Stack.Screen name="staff" />
      </Stack.Protected>
    </Stack>
  );
}

function BootScreen({
  error,
  onRetry,
  onSkip,
}: {
  error: string | null;
  onRetry: () => void;
  onSkip: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-paper p-8">
      <LogoMark />
      {error ? (
        <>
          <Text className="text-center text-base text-ink">{error}</Text>
          <Button action="primary" className="w-full" onPress={onRetry}>
            <ButtonText>Thử lại</ButtonText>
          </Button>
          <Button action="muted" variant="outline" className="w-full" onPress={onSkip}>
            <ButtonText>Đăng nhập lại</ButtonText>
          </Button>
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.teal} />
          <Text className="text-sm text-slate-500">Đang kiểm tra phiên đăng nhập…</Text>
        </>
      )}
    </View>
  );
}
