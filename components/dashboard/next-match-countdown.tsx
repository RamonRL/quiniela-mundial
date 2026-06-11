"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, PencilLine } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TeamFlag } from "@/components/brand/team-flag";
import { roundOrGroupLabel, type HeroMatch } from "./hero-card";

/**
 * Protagonista cuando NO hay directo: el siguiente partido como marcador de
 * pre-partido, con cuenta atrás en vivo (pieza central con glow) y el
 * recordatorio de pronóstico integrado inline en rojo arena (sin caja amarilla).
 */
export function NextMatchCountdown({ match }: { match: HeroMatch }) {
  const { home, away, dateLabel, venue, kickoffISO, prediction, href } = match;
  const label = roundOrGroupLabel(match);
  const target = kickoffISO ? new Date(kickoffISO).getTime() : 0;
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!kickoffISO) return;
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, kickoffISO]);

  const live = remaining != null && remaining <= 0;
  const totalSecs = remaining != null ? Math.max(0, Math.floor(remaining / 1000)) : null;
  const d = totalSecs != null ? Math.floor(totalSecs / 86400) : null;
  const h = totalSecs != null ? Math.floor((totalSecs % 86400) / 3600) : null;
  const m = totalSecs != null ? Math.floor((totalSecs % 3600) / 60) : null;
  const s = totalSecs != null ? totalSecs % 60 : null;
  const pad = (n: number | null) => (n == null ? "--" : n.toString().padStart(2, "0"));

  // Solo el bloque principal (eyebrow + equipos/VS + contador) es clicable al
  // partido. La fila de fecha + recordatorio de pronóstico queda FUERA del
  // enlace, para no robarle clics al botón de pronóstico (sobre todo en móvil).
  const mainBlock = (
    <>
      {/* Eyebrow */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="h-px w-7 bg-[var(--color-arena)]" />
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
          Próximo partido
        </span>
        {label ? (
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {label}
          </span>
        ) : null}
      </div>

      {/* Equipos — abrazan el VS (banderas al exterior, nombres al centro).
          En hover (PC), los nombres pasan a rojo para indicar que toda la
          zona principal lleva al partido. */}
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        <span className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
          <TeamFlag code={home?.code} size={46} className="shrink-0" />
          <span className="text-balance break-words text-right font-display text-3xl leading-[1.05] tracking-tight transition-colors group-hover:text-[var(--color-arena)] sm:text-[2.6rem]">
            {home?.name ?? "TBD"}
          </span>
        </span>
        <span className="shrink-0 font-display text-base text-[var(--color-muted-foreground)] sm:text-xl">
          VS
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-start gap-2.5">
          <span className="text-balance break-words text-left font-display text-3xl leading-[1.05] tracking-tight transition-colors group-hover:text-[var(--color-arena)] sm:text-[2.6rem]">
            {away?.name ?? "TBD"}
          </span>
          <TeamFlag code={away?.code} size={46} className="shrink-0" />
        </span>
      </div>

      {/* Cuenta atrás (pieza central) */}
      {live ? (
        <span className="text-center font-display glow-arena text-5xl leading-none tracking-tighter text-[var(--color-arena)] sm:text-6xl">
          ¡En juego!
        </span>
      ) : (
        <div className="flex items-end justify-center gap-3 sm:gap-5">
          {d == null || d > 0 ? <Segment value={pad(d)} label="días" /> : null}
          <Segment value={pad(h)} label="horas" />
          <Segment value={pad(m)} label="min" />
          <Segment value={pad(s)} label="seg" dim />
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      {href ? (
        <Link
          href={href}
          aria-label={`${home?.name ?? "TBD"} vs ${away?.name ?? "TBD"}`}
          className="group flex flex-col gap-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
        >
          {mainBlock}
        </Link>
      ) : (
        <div className="flex flex-col gap-4">{mainBlock}</div>
      )}

      <div className="h-px bg-[var(--color-border)]" />

      {/* Fecha + recordatorio de pronóstico (FUERA del enlace al partido) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          {dateLabel}
          {venue ? ` · ${venue}` : ""}
        </p>
        {prediction && !live ? <PredictionPill prediction={prediction} /> : null}
      </div>
    </div>
  );
}

function PredictionPill({ prediction }: { prediction: { hasResult: boolean; href: string } }) {
  if (prediction.hasResult) {
    return (
      <Link
        href={prediction.href}
        className="group pointer-events-auto relative z-10 inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
      >
        <PencilLine className="size-3.5" />
        Pronóstico listo · editar
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  }
  return (
    <Link
      href={prediction.href}
      className="group pointer-events-auto relative z-10 inline-flex items-center gap-2 rounded-full border border-[var(--color-arena)]/55 bg-[color-mix(in_oklch,var(--color-arena)_14%,transparent)] px-3 py-1.5 text-[var(--color-arena)] transition hover:bg-[color-mix(in_oklch,var(--color-arena)_22%,transparent)]"
    >
      <span className="relative flex size-3.5 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-50" />
        <AlertTriangle className="relative size-3.5" />
      </span>
      <span className="text-xs font-semibold">Te falta tu pronóstico</span>
      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Segment({ value, label, dim }: { value: string; label: string; dim?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`font-display tabular leading-none tracking-tighter text-[3rem] sm:text-[4rem] ${
          dim ? "text-[var(--color-muted-foreground)]" : "glow-arena text-[var(--color-arena)]"
        }`}
      >
        {value}
      </span>
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-[var(--color-muted-foreground)]">
        {label}
      </span>
    </div>
  );
}
