"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

type Context = {
  league: { name: string; joinCode: string | null } | null;
};

/**
 * Banner sutil de "Comprando para tu quiniela X" en /precios. Vive en
 * un client component para que la página se sirva cacheada y el
 * banner se hidrate después leyendo /api/me/buyer-context. Sin
 * sesión o sin liga elegible, no renderiza nada.
 *
 * El payload del endpoint es trivial y no expone PII más allá del
 * nombre de la liga del propio usuario, así que no lleva
 * suspense/skeleton — aparece silencioso cuando carga.
 */
export function BuyerLeagueBanner() {
  const [ctx, setCtx] = useState<Context | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/buyer-context", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Context | null) => {
        if (!cancelled) setCtx(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ctx?.league || !ctx.league.joinCode) return null;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
      <Sparkles aria-hidden className="size-3 text-[var(--color-arena)]" />
      <span>
        Comprando para{" "}
        <span className="font-medium text-[var(--color-foreground)]">
          {ctx.league.name}
        </span>{" "}
        <span className="font-mono tracking-[0.1em]">
          ({ctx.league.joinCode})
        </span>{" "}
        — activación automática tras el pago.
      </span>
    </p>
  );
}
