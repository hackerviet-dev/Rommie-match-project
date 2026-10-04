import { ShieldCheck } from "lucide-react-native";
import { Text, View } from "react-native";
import { FormScreen } from "@/components/form-screen";
import { Button, ButtonText } from "@/components/ui/button";
import { useAuthStore, useSignOut } from "@/features/auth";
import { colors } from "@/theme/colors";

// Ứng dụng mobile chỉ dành cho thành viên; trang quản trị nằm trên web.
export default function StaffScreen() {
  const user = useAuthStore((state) => state.user);
  const signOut = useSignOut();
  return (
    <FormScreen>
      <View className="flex-1 items-center justify-center gap-4">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-mint/30">
          <ShieldCheck color={colors.navy} size={30} />
        </View>
        <Text className="text-center text-2xl font-bold text-ink">Tài khoản quản trị</Text>
        <Text className="text-center text-sm leading-5 text-slate-500">
          {user?.email} có quyền {user?.role}. Trang quản trị chỉ có trên web, ứng dụng di động dành
          cho thành viên.
        </Text>
        <Button
          action="primary"
          className="mt-2 h-12 w-full"
          disabled={signOut.isPending}
          onPress={() => signOut.mutate(false)}
        >
          <ButtonText>Đăng xuất</ButtonText>
        </Button>
      </View>
    </FormScreen>
  );
}
