import { m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div>
      {!shouldReduceMotion && <m.div
        key={`progress-${pathname}`}
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 origin-left bg-teal"
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ scaleX: { duration: 0.4 }, opacity: { delay: 0.4, duration: 0.15 } }}
      />}
      <m.div
        key={pathname}
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </m.div>
    </div>
  );
}
