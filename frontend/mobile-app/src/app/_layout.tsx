import "../../global.css";

import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import App from "@/App";
import { LogoMark } from "@/components/logo-mark";
import { Button, ButtonText } from "@/components/ui/button";
import { isStaffRole, useAuthSession, useAuthStore } from "@/features/auth";
import { useChatRealtime } from "@/features/chat";
import { onboardingApi } from "@/features/onboarding";
import { colors } from "@/theme/colors";

export default function RootLayout() {
  return (
    <App>
      <RootNavigator />
    </App>
  );
}

// Thay cho AuthGuard/ActorEntry/OnboardingGate của web: mỗi nhóm route chỉ tồn tại khi
// guard đúng, nên đăng nhập, đăng xuất hay lưu onboarding tự chuyển màn hình. Khi nhiều màn
// cùng hợp lệ, màn khai báo trước được mở đầu tiên. Admin/moderator chỉ dùng web.
function RootNavigator() {
  const { bootError, retry, skip } = useAuthSession();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const isStaff = isAuthenticated && isStaffRole(user?.role);
  const isMember = isAuthenticated && !isStaff;
  const onboarding = useQuery({
    queryKey: ["onboarding", user?.id],
    queryFn: onboardingApi.getStatus,
    enabled: isMember,
    retry: false,
  });
  const onboarded = Boolean(onboarding.data?.isComplete);
  useChatRealtime(isMember && onboarded);

  if (!isInitialized) return <BootScreen error={bootError} onRetry={retry} onSkip={skip} />;
  if (isMember && onboarding.isError)
    return (
      <BootScreen
        error={`Không thể kiểm tra hồ sơ. ${onboarding.error.message}`}
        onRetry={() => void onboarding.refetch()}
        onSkip={skip}
      />
    );
  if (isMember && onboarding.isPending)
    return <BootScreen error={null} message="Đang kiểm tra hồ sơ…" onRetry={retry} onSkip={skip} />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isMember && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={isMember && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="account" />
        <Stack.Screen name="profile/[id]" />
        <Stack.Screen name="saved" />
        <Stack.Screen name="requests" />
        <Stack.Screen name="rooms/[id]" />
        <Stack.Screen name="rooms/new" />
        <Stack.Screen name="rooms/edit/[id]" />
        <Stack.Screen name="my-rooms" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="services/[id]" />
        <Stack.Screen name="bookings/index" />
        <Stack.Screen name="bookings/[id]" />
        <Stack.Screen name="payments/index" />
        <Stack.Screen name="payments/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={isMember}>
        <Stack.Screen name="quiz" />
      </Stack.Protected>
      <Stack.Protected guard={isStaff}>
        <Stack.Screen name="staff" />
      </Stack.Protected>
    </Stack>
  );
}

function BootScreen({
  error,
  message = "Đang kiểm tra phiên đăng nhập…",
  onRetry,
  onSkip,
}: {
  error: string | null;
  message?: string;
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
          <Text className="text-sm text-slate-500">{message}</Text>
        </>
      )}
    </View>
  );
}
