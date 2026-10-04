import type { ReactNode, RefObject } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Khung cho các màn có bàn phím (đăng nhập, đăng ký, form): nội dung cuộn được và không bị
// bàn phím che.
export function FormScreen({
  children,
  scrollRef,
}: {
  children: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  return (
    <SafeAreaView className="flex-1 bg-paper">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
