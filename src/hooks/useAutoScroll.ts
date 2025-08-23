// hooks/useAutoScroll.ts
import { useEffect } from "react";

export function useAutoScroll(
  depends: any[],
  ref: React.RefObject<HTMLElement | null>, // ← permitir null
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, depends);
}
