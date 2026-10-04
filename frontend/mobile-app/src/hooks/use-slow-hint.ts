import { useEffect, useState } from "react";

// true khi một việc đang chờ lâu hơn `delayMs`, để báo người dùng thay vì để màn hình im lặng.
export function useSlowHint(active: boolean, delayMs = 4000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!active) return;
    const timer = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);
  return slow;
}
