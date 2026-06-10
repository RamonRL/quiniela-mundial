"use client";

import { useEffect, useState } from "react";

export type CountdownLabels = {
  eyebrow: string; // "Próximo partido"
  live: string; // "¡En juego!"
  units: { d: string; h: string; m: string; s: string };
};

type Team = { code: string; name: string } | null;

/**
 * Cuenta atrás EN VIVO al próximo partido — variante del hero del dashboard
 * para cuando el torneo ya ha empezado (sustituye al "Faltan 02 días").
 * Tictac cada segundo en cliente. Reutilizable: hoy se muestra en /admin/preview
 * y más adelante se enchufa al dashboard real.
 */
export function NextMatchCountdown({
  kickoffISO,
  matchCode,
  home,
  away,
  dateLabel,
  labels,
}: {
  kickoffISO: string;
  matchCode: string;
  home: Team;
  away: Team;
  dateLabel: string;
  labels: CountdownLabels;
}) {
  const target = new Date(kickoffISO).getTime();
  // null en SSR/primer paint → evita hydration mismatch; el efecto lo rellena.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const live = remaining != null && remaining <= 0;
  const totalSecs = remaining != null ? Math.max(0, Math.floor(remaining / 1000)) : null;
  const d = totalSecs != null ? Math.floor(totalSecs / 86400) : null;
  const h = totalSecs != null ? Math.floor((totalSecs % 86400) / 3600) : null;
  const m = totalSecs != null ? Math.floor((totalSecs % 3600) / 60) : null;
  const s = totalSecs != null ? totalSecs % 60 : null;

  const pad = (n: number | null) => (n == null ? "--" : n.toString().padStart(2, "0"));

  return (
    <div className="flex flex-col justify-between gap-6">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-[var(--color-arena)]" />
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {labels.eyebrow} · {matchCode}
        </span>
      </div>

      {/* Emparejamiento */}
      <div className="flex items-center gap-2 font-display text-2xl tracking-tight sm:text-3xl">
        <span className="truncate">{home?.name ?? "TBD"}</span>
        <span className="text-[var(--color-muted-foreground)]">·</span>
        <span className="truncate">{away?.name ?? "TBD"}</span>
      </div>

      {/* Cuenta atrás en vivo */}
      {live ? (
        <span className="font-display glow-arena text-6xl leading-none tracking-tighter text-[var(--color-arena)] sm:text-7xl">
          {labels.live}
        </span>
      ) : (
        <div className="flex items-end gap-3 sm:gap-4">
          {(d == null || d > 0) ? (
            <Segment value={pad(d)} label={labels.units.d} />
          ) : null}
          <Segment value={pad(h)} label={labels.units.h} />
          <Segment value={pad(m)} label={labels.units.m} />
          <Segment value={pad(s)} label={labels.units.s} dim />
        </div>
      )}

      <p className="font-editorial text-base italic text-[var(--color-muted-foreground)] sm:text-lg">
        {dateLabel}
      </p>
    </div>
  );
}

function Segment({ value, label, dim }: { value: string; label: string; dim?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`font-display tabular leading-none tracking-tighter text-[3.5rem] sm:text-[5rem] ${
          dim ? "text-[var(--color-muted-foreground)]" : "glow-arena text-[var(--color-arena)]"
        }`}
      >
        {value}
      </span>
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {label}
      </span>
    </div>
  );
}
