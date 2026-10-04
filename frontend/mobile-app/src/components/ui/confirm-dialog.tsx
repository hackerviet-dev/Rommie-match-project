import type { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Button, ButtonText } from "./button";

// Hộp thoại dựng bằng Modal thay cho Alert.alert, để có cùng giao diện trên Android/iOS
// và chạy được cả trên bản web dùng để thử.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  loading,
  confirmDisabled,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Đóng"
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/40 p-6"
      >
        <Pressable
          accessibilityRole="none"
          onPress={() => {}}
          className="w-full max-w-md gap-4 rounded-3xl bg-white p-6"
        >
          <Text accessibilityRole="header" className="text-xl font-bold text-ink">
            {title}
          </Text>
          {description ? (
            <Text className="text-sm leading-5 text-slate-500">{description}</Text>
          ) : null}
          {children}
          <View className="flex-row gap-3">
            <Button action="muted" variant="outline" className="h-12 flex-1" onPress={onClose}>
              <ButtonText>Huỷ</ButtonText>
            </Button>
            <Button
              action="primary"
              className={destructive ? "h-12 flex-1 bg-red-600" : "h-12 flex-1"}
              loading={loading}
              disabled={confirmDisabled}
              onPress={onConfirm}
            >
              <ButtonText>{confirmLabel}</ButtonText>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
