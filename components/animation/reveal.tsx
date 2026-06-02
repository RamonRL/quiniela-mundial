"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

type RevealVariant = "up" | "down" | "left" | "right" | "scale" | "fade";

interface RevealProps {
  children: ReactNode;
  /** Dirección/forma de entrada. */
  variant?: RevealVariant;
  /** Retardo en ms — úsalo con el índice para escalonar (stagger) listas. */
  delay?: number;
  /** Etiqueta a renderizar (div por defecto). */
  as?: ElementType;
  className?: string;
  /** Fracción visible para disparar (0–1). */
  amount?: number;
}

/**
 * Revela su contenido (fade + desplazamiento) la primera vez que entra en el
 * viewport. Server-friendly: los children se renderizan siempre en el DOM
 * (solo cambia opacity/transform). Respeta prefers-reduced-motion y la
 * ausencia de IntersectionObserver mostrando el estado final al instante.
 */
export function Reveal({
  children,
  variant = "up",
  delay = 0,
  as,
  className = "",
  amount = 0.15,
}: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: amount, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [amount]);

  return (
    <Tag
      ref={ref}
      className={`reveal reveal-${variant}${visible ? " is-visible" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
