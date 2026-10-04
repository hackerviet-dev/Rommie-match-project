import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useEffect } from "react";
import { AppState, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { queryClient } from "@/lib/query-client";

// Provider gốc của app, được src/app/_layout.tsx (expo-router) bọc quanh mọi màn hình.
export default function App({ children }: { children: ReactNode }) {
  // React Query chỉ biết "focus" của trình duyệt; trên điện thoại, mở lại app (AppState
  // "active") mới là lúc cần tải lại dữ liệu, ví dụ tin nhắn đến khi app chạy nền.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GluestackUIProvider>
          <StatusBar style="dark" />
          {children}
        </GluestackUIProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
