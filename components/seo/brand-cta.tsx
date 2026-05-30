import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Bloque de cierre que coloco al final de cada página vertical pública
 * (/calendario, /grupos, /bracket, /goleadores, /equipos, /sedes).
 *
 * Función SEO: cada instancia es un link interno hacia la home con un
 * anchor text que apunta a la marca. La mitad de las verticales usan el
 * trigrama exacto "Quiniela Mundial 2026" (empuja la query con año) y la
 * otra mitad usa solo "Quiniela Mundial" (no penaliza la query bigrama y
 * mantiene diversidad de anchor text para que Google no lea el internal
 * linking como manipulado).
 *
 * El copy invita a actuar (crear quiniela) y se ve coherente con el
 * resto del producto; no es un bloque-keyword artificial.
 */
export function BrandCTA({
  hint,
  /**
   * `withYear` (default): anchor "Quiniela Mundial 2026" — empuja la
   * query con año.
   * `bare`: anchor "Quiniela Mundial" — mantiene visibilidad de la
   * marca a secas para la query sin año.
   */
  brandVariant = "withYear",
}: {
  hint?: string;
  brandVariant?: "withYear" | "bare";
}) {
  const brandText = brandVariant === "withYear" ? "Quiniela Mundial 2026" : "Quiniela Mundial";
  return (
    <aside className="rounded-2xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-6 text-center sm:p-8">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        Predice este Mundial con tu grupo
      </p>
      <p className="mt-3 font-display text-2xl tracking-tight sm:text-3xl">
        Llévalo todo a tu quiniela en{" "}
        <Link
          href="/"
          className="text-[var(--color-arena)] underline-offset-4 hover:underline"
        >
          {brandText}
        </Link>
      </p>
      {hint ? (
        <p className="mx-auto mt-2 max-w-lg font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
          {hint}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login?next=%2Fonboarding"
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
        >
          Crear quiniela gratis
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/precios"
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
        >
          Planes para empresas
        </Link>
      </div>
    </aside>
  );
}
