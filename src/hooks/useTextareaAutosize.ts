// hooks/useTextareaAutosize.ts
import { useEffect } from "react";

export function useTextareaAutosize(
  ref: React.RefObject<HTMLTextAreaElement | null>, // ← permitir null
  value: string,
  max = 220,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  }, [value, max]);
}
