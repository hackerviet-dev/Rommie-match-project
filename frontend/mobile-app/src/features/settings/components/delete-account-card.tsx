import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAuthStore, useDeleteAccount } from "@/features/auth";

export function DeleteAccountCard() {
  const email = useAuthStore((state) => state.user?.email ?? "");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const deleteAccount = useDeleteAccount();
  const isEmailMatched = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  function handleConfirm() {
    deleteAccount.mutate(
      { confirmEmail: confirmEmail.trim(), password: password || null },
      { onError: () => setIsConfirmOpen(false) },
    );
  }

  return (
    <Card className="gap-3 border border-red-200">
      <View className="flex-row items-center gap-2">
        <Trash2 color="#dc2626" size={18} />
        <Text className="text-lg font-bold text-red-700">Xoá tài khoản</Text>
      </View>
      <Text className="text-sm leading-5 text-slate-500">
        Bạn bị đăng xuất khỏi mọi thiết bị, hồ sơ và tin phòng bị ẩn ngay. Sau 30 ngày, tài khoản
        cùng hồ sơ, ảnh, tin phòng, tin nhắn, ghép đôi và lịch sử thanh toán bị xoá vĩnh viễn.
      </Text>
      <FormField label="Nhập lại email của bạn">
        <Input
          accessibilityLabel="Nhập lại email của bạn"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder={email}
          value={confirmEmail}
          onChangeText={setConfirmEmail}
        />
      </FormField>
      <FormField label="Mật khẩu hiện tại">
        <Input
          accessibilityLabel="Mật khẩu hiện tại"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />
        <Text className="text-xs text-slate-500">Bỏ trống nếu bạn chỉ đăng nhập bằng Google.</Text>
      </FormField>
      <FormError message={deleteAccount.error?.message} />
      <Button
        action="primary"
        className="h-11 bg-red-600"
        disabled={!isEmailMatched || deleteAccount.isPending}
        onPress={() => setIsConfirmOpen(true)}
      >
        <ButtonText>Xoá tài khoản của tôi</ButtonText>
      </Button>
      <ConfirmDialog
        open={isConfirmOpen}
        title="Xoá tài khoản RoomieMatch?"
        description="Bạn sẽ bị đăng xuất ngay và không đăng nhập lại được. Dữ liệu bị xoá vĩnh viễn sau 30 ngày."
        confirmLabel="Xoá tài khoản"
        destructive
        loading={deleteAccount.isPending}
        onConfirm={handleConfirm}
        onClose={() => setIsConfirmOpen(false)}
      />
    </Card>
  );
}
