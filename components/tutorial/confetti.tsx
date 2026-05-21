"use client";

import { useEffect, useRef } from "react";

/**
 * Burst de confeti en canvas — se monta una sola vez al final del
 * tutorial. Lanza ~80 partículas en desktop / ~50 en móvil desde el
 * centro de la pantalla, con gravedad simple. Vida total ~2.2 s.
 *
 * Respeta `prefers-reduced-motion`: si el usuario lo tiene activo, en
 * lugar de animación se hace un fade-out arena muy breve y se llama a
 * `onDone` igualmente.
 */
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  color: string;
  size: number;
};

const PALETTE = ["#b8895a", "#fafafa", "#c89b6e", "#a07849", "#e8d4b8"];
const DURATION_MS = 2200;
const GRAVITY = 0.4;
const DRAG = 0.99;

export function TutorialConfetti({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    ctx.scale(dpr, dpr);

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const count = isMobile ? 50 : 80;

    const cx = vw / 2;
    const cy = vh / 2;

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: cx + (Math.random() - 0.5) * 80,
      y: cy,
      vx: (Math.random() - 0.5) * 10,
      vy: -(Math.random() * 13 + 4),
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.35,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      size: 6 + Math.random() * 7,
    }));

    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed > DURATION_MS) {
        onDone();
        return;
      }
      const life = Math.max(0, 1 - elapsed / DURATION_MS);
      ctx.clearRect(0, 0, vw, vh);

      for (const p of particles) {
        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[122]"
    />
  );
}
