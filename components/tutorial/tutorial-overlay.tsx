"use client";

import { useEffect, useState } from "react";
import type { TutorialStep } from "@/lib/tutorial/steps";

type Props = {
  step: TutorialStep;
  targetRect: DOMRect | null;
};

const PADDING = 8;
const CORNER_RADIUS = 16;

/**
 * Overlay SVG full-screen con un "agujero" recortado alrededor del
 * elemento destacado. La técnica: un único <rect> blanco sobre una
 * máscara negra; el resto del overlay se rellena con un color oscuro
 * traslúcido. CSS transitions en x/y/width/height producen un deslice
 * suave cuando el spotlight salta entre pasos.
 *
 * Si `targetRect` es null (paso centrado o target no encontrado),
 * renderizamos un overlay sólido sin cutout — la card se posicionará
 * como modal centrado.
 */
export function TutorialOverlay({ step, targetRect }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const hasSpotlight = step.kind === "spotlight" && targetRect != null;

  // Cálculo del rect del cutout — ampliamos el área del target con un
  // padding cómodo para que el spotlight respire alrededor del elemento.
  const cutout = hasSpotlight && targetRect
    ? {
        x: Math.max(0, targetRect.x - PADDING),
        y: Math.max(0, targetRect.y - PADDING),
        w: targetRect.width + PADDING * 2,
        h: targetRect.height + PADDING * 2,
      }
    : null;

  if (size.w === 0 || size.h === 0) return null;

  return (
    <svg
      role="presentation"
      aria-hidden
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="none"
      className="pointer-events-auto fixed inset-0 z-[120]"
      style={{ touchAction: "none" }}
    >
      <defs>
        <mask id="tutorial-spotlight-mask">
          {/* Toda la pantalla visible (blanco = se pinta el overlay)... */}
          <rect x={0} y={0} width={size.w} height={size.h} fill="white" />
          {/* ...excepto el rect del cutout (negro = transparente). */}
          {cutout ? (
            <rect
              x={cutout.x}
              y={cutout.y}
              width={cutout.w}
              height={cutout.h}
              rx={CORNER_RADIUS}
              ry={CORNER_RADIUS}
              fill="black"
              style={{
                transition:
                  "x 0.4s ease, y 0.4s ease, width 0.4s ease, height 0.4s ease",
              }}
            />
          ) : null}
        </mask>
        <filter id="tutorial-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Capa oscura con cutout aplicado por mask. */}
      <rect
        x={0}
        y={0}
        width={size.w}
        height={size.h}
        fill="rgba(14,16,20,0.78)"
        mask="url(#tutorial-spotlight-mask)"
      />

      {/* Glow arena alrededor del cutout — solo cuando hay spotlight. */}
      {cutout ? (
        <rect
          x={cutout.x}
          y={cutout.y}
          width={cutout.w}
          height={cutout.h}
          rx={CORNER_RADIUS}
          ry={CORNER_RADIUS}
          fill="none"
          stroke="var(--color-arena)"
          strokeWidth={2}
          opacity={0.85}
          filter="url(#tutorial-glow)"
          style={{
            transition:
              "x 0.4s ease, y 0.4s ease, width 0.4s ease, height 0.4s ease",
          }}
        />
      ) : null}
    </svg>
  );
}
