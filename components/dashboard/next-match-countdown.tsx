"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, PencilLine } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TeamFlag } from "@/components/brand/team-flag";

export type CountdownLabels = {
  eyebrow: string; // "Próximo partido"
  live: string; // "¡En juego!"
  units: { d: string; h: string; m: string; s: string };
  group: string; // "Grupo"
  predDone: string; // "Ya tienes pronóstico · editable hasta el inicio"
  predDoneCta: string; // "Editar"
  predMissing: string; // "Aún no has puesto tu pronóstico de este partido"
  predMissingHint: string; // "Hazlo antes de que empiece"
  predMissingCta: string; // "Predecir ahora"
};

type Team = { code: string; name: string } | null;

/**
 * Cuenta atrás EN VIVO al próximo partido — variante del hero del dashboard
 * para cuando el torneo ya ha empezado (sustituye al "Faltan 02 días").
 * Tictac cada segundo en cliente. Incluye banderas, grupo y un recordatorio /
 * aviso según el usuario ya tenga (o no) pronóstico de ese partido — editable
 * hasta el kickoff.
 */
export function NextMatchCountdown({
  kickoffISO,
  matchCode,
  home,
  away,
  group,
  dateLabel,
  prediction,
  labels,
}: {
  kickoffISO: string;
  matchCode: string;
  home: Team;
  away: Team;
  group?: string | null;
  dateLabel: string;
  prediction: { hasResult: boolean; href: string };
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
    <div className="flex flex-col justify-between gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="h-px w-8 bg-[var(--color-arena)]" />
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {labels.eyebrow} · {matchCode}
        </span>
        {group ? (
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
            {labels.group} {group}
          </span>
        ) : null}
      </div>

      {/* Emparejamiento con banderas */}
      <div className="flex items-center gap-2.5 font-display text-2xl tracking-tight sm:text-3xl">
        <TeamFlag code={home?.code} size={30} />
        <span className="truncate">{home?.name ?? "TBD"}</span>
        <span className="px-1 text-[var(--color-muted-foreground)]">·</span>
        <span className="truncate">{away?.name ?? "TBD"}</span>
        <TeamFlag code={away?.code} size={30} />
      </div>

      {/* Cuenta atrás en vivo */}
      {live ? (
        <span className="font-display glow-arena text-6xl leading-none tracking-tighter text-[var(--color-arena)] sm:text-7xl">
          {labels.live}
        </span>
      ) : (
        <div className="flex items-end gap-3 sm:gap-4">
          {d == null || d > 0 ? <Segment value={pad(d)} label={labels.units.d} /> : null}
          <Segment value={pad(h)} label={labels.units.h} />
          <Segment value={pad(m)} label={labels.units.m} />
          <Segment value={pad(s)} label={labels.units.s} dim />
        </div>
      )}

      <p className="font-editorial text-base italic text-[var(--color-muted-foreground)]">
        {dateLabel}
      </p>

      {/* Recordatorio / aviso de pronóstico — solo si el partido no ha empezado */}
      {!live ? (
        prediction.hasResult ? (
          <Link
            href={prediction.href}
            className="group inline-flex items-center justify-between gap-3 rounded-xl border border-[var(--color-success)]/40 bg-[color-mix(in_oklch,var(--color-success)_7%,transparent)] px-4 py-3 transition hover:border-[var(--color-success)]"
          >
            <span className="flex items-center gap-2.5 text-sm">
              <PencilLine className="size-4 shrink-0 text-[var(--color-success)]" />
              <span>{labels.predDone}</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-success)]">
              {labels.predDoneCta} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ) : (
          <Link
            href={prediction.href}
            className="group flex items-center justify-between gap-3 rounded-xl border-2 border-[var(--color-warning)]/60 bg-[color-mix(in_oklch,var(--color-warning)_12%,var(--color-surface))] px-4 py-3 shadow-[var(--shadow-elev-1)] transition hover:border-[var(--color-warning)]"
          >
            <span className="flex items-center gap-3">
              <span className="relative flex size-5 shrink-0 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-warning)] opacity-60" />
                <AlertTriangle className="relative size-5 text-[var(--color-warning)]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">{labels.predMissing}</span>
                <span className="block text-xs text-[var(--color-muted-foreground)]">{labels.predMissingHint}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-[var(--color-warning)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-black">
              {labels.predMissingCta} <ArrowRight className="size-3.5" />
            </span>
          </Link>
        )
      ) : null}
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
