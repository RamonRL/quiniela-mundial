"use client";

import { useEffect, useRef, useState } from "react";

interface CounterProps {
  /** Valor final. */
  to: number;
  /** Duración de la cuenta en ms. */
  duration?: number;
  prefix?: string;
  suffix?: string;
  /** Si se indica (BCP-47), formatea con separador de miles (p. ej. "50.000"). */
  locale?: string;
  className?: string;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Cuenta de 0 a `to` la primera vez que entra en viewport. SSR renderiza el
 * valor final (bueno para SEO); reduced-motion / sin IO muestra `to` directo.
 */
export function Counter({ to, duration = 1200, prefix = "", suffix = "", locale, className }: CounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(to);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setValue(to);
      return;
    }

    setValue(0);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || started.current) return;
        started.current = true;
        observer.disconnect();
        let raf = 0;
        let startTs = 0;
        const tick = (ts: number) => {
          if (!startTs) startTs = ts;
          const p = Math.min(1, (ts - startTs) / duration);
          setValue(Math.round(easeOutCubic(p) * to));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {locale ? value.toLocaleString(locale) : value}
      {suffix}
    </span>
  );
}
