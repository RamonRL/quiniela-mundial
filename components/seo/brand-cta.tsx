import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Bloque de cierre que coloco al final de cada página vertical pública
 * (/calendario, /grupos, /bracket, /goleadores, /equipos, /sedes).
 *
 * Función SEO específica: cada instancia es un link interno hacia la home
 * cuyo anchor text es exactamente **"Quiniela Mundial 2026"** (el trigrama
 * que queremos rankear). Con esto la home recibe 6 votos internos con el
 * anchor exacto — la señal de internal-linking más fuerte para empujar
 * esa query en concreto.
 *
 * El copy invita a actuar (crear quiniela) y se ve coherente con el
 * resto del producto; no es un bloque-keyword artificial.
 */
export function BrandCTA({ hint }: { hint?: string }) {
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
          Quiniela Mundial 2026
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
