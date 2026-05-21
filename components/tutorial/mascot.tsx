"use client";

import Image from "next/image";

/**
 * Mascota del tutorial. Sirve la imagen desde `/mascota.png`
 * (en `/public/`) optimizada por next/image — el archivo source
 * puede ser grande pero el browser solo descarga la variante del
 * tamaño que necesita.
 *
 * Dos tonos de animación, controlados desde el card:
 *   - `idle`: rebote vertical suave continuo (estado default).
 *   - `wiggle`: rotación pendular rápida — se activa solo en el paso
 *     final mientras explota el confeti.
 *
 * Decoración pura → `aria-hidden`.
 */
export function TutorialMascot({ tone = "idle" }: { tone?: "idle" | "wiggle" }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 size-16 sm:size-20 ${
        tone === "wiggle"
          ? "tutorial-mascot-wiggle"
          : "tutorial-mascot-idle"
      }`}
    >
      {/* Halo arena suave detrás de la mascota para que destaque
          contra el surface del card. Decoración pura — sin sombra
          fuerte porque la mascota ya tiene su silueta propia. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 rounded-full bg-[var(--color-arena)]/12 blur-md"
      />
      <Image
        src="/mascota.png"
        alt=""
        width={96}
        height={96}
        className="size-full object-contain drop-shadow-[0_2px_8px_rgba(184,137,90,0.25)]"
        priority
      />
    </span>
  );
}
