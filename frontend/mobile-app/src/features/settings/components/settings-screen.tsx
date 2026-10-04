import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { router } from "expo-router";
import { BookOpen, ChevronRight, LogOut, MonitorSmartphone, UserX } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { FormScreen } from "@/components/form-screen";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-field";
import { useAuthStore, useSignOut } from "@/features/auth";
import { safetyApi } from "@/features/profile";
import { API_BASE_URL } from "@/services/api-client";
import { colors } from "@/theme/colors";

// "Cài đặt & bảo mật" của web, bỏ các mục web còn ghi "Sắp có" (thông báo, quyền riêng tư,
// đổi mật khẩu, ngôn ngữ).
export function SettingsScreen() {
  const me = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const signOut = useSignOut();
  const blocks = useQuery({ queryKey: ["blocks", me], queryFn: () => safetyApi.blocks(1) });
  const unblock = useMutation({
    mutationFn: safetyApi.unblock,
    onSuccess: () => {
      for (const key of ["blocks", "matching", "saved-profiles", "chat"])
        void client.invalidateQueries({ queryKey: [key] });
    },
  });

  return (
    <FormScreen>
      <StackHeader title="Cài đặt & bảo mật" />
      <View className="mt-4 gap-4">
        <Card className="gap-3">
          <View className="flex-row items-center gap-2">
            <UserX color={colors.navy} size={18} />
            <Text className="text-lg font-bold text-ink">Người đã chặn</Text>
          </View>
          <QueryState query={blocks} />
          {blocks.data?.totalCount === 0 ? (
            <Text className="text-sm text-slate-500">Bạn chưa chặn ai.</Text>
          ) : null}
          {blocks.data?.items.map((user) => (
            <View key={user.userId} className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-base text-ink">{user.displayName}</Text>
                <Text className="text-xs text-slate-500">
                  Chặn ngày {new Date(user.blockedAt).toLocaleDateString("vi-VN")}
                </Text>
              </View>
              <Button
                action="primary"
                variant="outline"
                size="sm"
                accessibilityLabel={`Bỏ chặn ${user.displayName}`}
                loading={unblock.isPending && unblock.variables === user.userId}
                onPress={() => unblock.mutate(user.userId)}
              >
                <ButtonText>Bỏ chặn</ButtonText>
              </Button>
            </View>
          ))}
          {blocks.data?.hasNextPage ? (
            <Text className="text-xs text-slate-500">
              Đang hiện 20 người đầu tiên. Bỏ chặn bớt để xem tiếp.
            </Text>
          ) : null}
          <FormError message={unblock.error?.message} />
        </Card>

        <Pressable accessibilityRole="button" onPress={() => router.push("/guidelines")}>
          <Card className="flex-row items-center gap-3">
            <BookOpen color={colors.navy} size={18} />
            <Text className="flex-1 text-base font-semibold text-ink">Quy tắc cộng đồng</Text>
            <ChevronRight color={colors.teal} size={18} />
          </Card>
        </Pressable>

        <Card className="gap-3">
          <Text className="text-lg font-bold text-ink">Phiên đăng nhập</Text>
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
            className="h-11"
            disabled={signOut.isPending}
            onPress={() => signOut.mutate(false)}
          >
            <ButtonIcon as={LogOut} />
            <ButtonText>Đăng xuất thiết bị này</ButtonText>
          </Button>
          <Button
            action="muted"
            variant="outline"
            className="h-11 border-red-300"
            disabled={signOut.isPending}
            onPress={() => signOut.mutate(true)}
          >
            <ButtonIcon as={MonitorSmartphone} />
            <ButtonText className="text-red-600">Đăng xuất khỏi mọi thiết bị</ButtonText>
          </Button>
        </Card>

        <View className="items-center gap-1 py-2">
          <Text className="text-xs text-slate-400">
            RoomieMatch {Constants.expoConfig?.version ?? ""}
          </Text>
          <Text className="text-xs text-slate-400">Máy chủ: {API_BASE_URL}</Text>
        </View>
      </View>
    </FormScreen>
  );
}
