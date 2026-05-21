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
      className={`inline-flex shrink-0 size-9 sm:size-11 ${
        tone === "wiggle"
          ? "tutorial-mascot-wiggle"
          : "tutorial-mascot-idle"
      }`}
    >
      <Image
        src="/mascota.png"
        alt=""
        width={44}
        height={44}
        className="size-full object-contain"
        priority
      />
    </span>
  );
}
