"use client";

import { useEffect, useRef } from "react";

/**
 * Parallax sutil ligado al scroll: desplaza el elemento en Y según su posición
 * relativa al viewport. Un único listener rAF-throttled. Respeta
 * prefers-reduced-motion (no aplica transform).
 *
 * @param strength px máximos de desplazamiento (signo invierte el sentido).
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(strength = 16) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // -1 (justo bajo el viewport) → 1 (justo encima); 0 ≈ centrado.
      const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
      const clamped = Math.max(-1, Math.min(1, progress));
      node.style.transform = `translate3d(0, ${(clamped * strength).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength]);

  return ref;
}
