import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { trackPageView } from "@/services/analytics";

export function usePageAnalytics() {
  const { pathname } = useLocation();
  useEffect(() => { trackPageView(pathname); }, [pathname]);
}
