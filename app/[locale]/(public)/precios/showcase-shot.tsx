"use client";

import Image, { type StaticImageData } from "next/image";
import { useParallax } from "@/components/animation/use-parallax";

/**
 * Captura de producto enmarcada como ventana de navegador, flotando sobre
 * un glow del color arena con parallax sutil al scroll. Es la pieza visual
 * de cada showcase de /precios: la feature no se cuenta, se enseña.
 */
export function ShowcaseShot({
  shot,
  alt,
  urlLabel,
  priority = false,
}: {
  shot: StaticImageData;
  alt: string;
  /** Texto de la pseudo-barra de direcciones (p. ej. el nombre de la liga demo). */
  urlLabel: string;
  priority?: boolean;
}) {
  const parallax = useParallax<HTMLDivElement>(14);

  return (
    <div ref={parallax} className="relative">
      {/* Glow de fondo — la captura flota sobre él. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[2rem] opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, color-mix(in oklch, var(--color-arena) 26%, transparent), transparent 70%)",
        }}
      />
      <figure className="group relative overflow-hidden rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[var(--shadow-elev-2)] transition-transform duration-300 hover:-translate-y-1 hover:rotate-[0.4deg]">
        {/* Chrome de navegador: 3 puntos + barra de direcciones. */}
        <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2.5">
          <span aria-hidden className="flex gap-1.5">
            <i className="size-2.5 rounded-full bg-[#ff5f57]" />
            <i className="size-2.5 rounded-full bg-[#febc2e]" />
            <i className="size-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[var(--color-arena)]" />
            <span className="truncate">{urlLabel}</span>
          </span>
        </div>
        <Image
          src={shot}
          alt={alt}
          placeholder="blur"
          priority={priority}
          sizes="(min-width: 1024px) 600px, 100vw"
          className="h-auto w-full"
        />
        {/* Brillo que cruza la captura al hacer hover. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100"
        />
      </figure>
    </div>
  );
}
