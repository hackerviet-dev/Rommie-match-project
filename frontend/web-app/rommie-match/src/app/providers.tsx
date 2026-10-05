import { QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import type { ReactNode } from "react";

import { ErrorBoundary } from "@/components/common/error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "./query-client";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <MotionConfig
        reducedMotion="user"
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <LazyMotion features={domAnimation} strict>
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster />
          </QueryClientProvider>
        </LazyMotion>
      </MotionConfig>
    </ErrorBoundary>
  );
}
