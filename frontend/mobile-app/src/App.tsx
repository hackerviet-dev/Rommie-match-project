import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { queryClient } from "@/lib/query-client";

// Provider gốc của app, được src/app/_layout.tsx (expo-router) bọc quanh mọi màn hình.
export default function App({ children }: { children: ReactNode }) {
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
