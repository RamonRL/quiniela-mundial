"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, PencilLine } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TeamFlag } from "@/components/brand/team-flag";
import type { HeroMatch, HeroTeam } from "./hero-card";

/**
 * Protagonista cuando NO hay directo: el siguiente partido como marcador de
 * pre-partido, con cuenta atrás en vivo (pieza central con glow) y el
 * recordatorio de pronóstico integrado inline en rojo arena (sin caja amarilla).
 */
export function NextMatchCountdown({ match }: { match: HeroMatch }) {
  const { home, away, group, code, dateLabel, venue, kickoffISO, prediction } = match;
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

  return (
    <div className="flex flex-col gap-4">
      {/* Eyebrow */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="h-px w-7 bg-[var(--color-arena)]" />
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
          Próximo partido · {code}
        </span>
        {group ? (
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            Grupo {group}
          </span>
        ) : null}
      </div>

      {/* Equipos */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Team team={home} align="start" />
        <span className="font-display text-lg text-[var(--color-muted-foreground)] sm:text-xl">VS</span>
        <Team team={away} align="end" />
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

      <div className="h-px bg-[var(--color-border)]" />

      {/* Fecha + recordatorio de pronóstico */}
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
        className="group inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
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
      className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-arena)]/55 bg-[color-mix(in_oklch,var(--color-arena)_14%,transparent)] px-3 py-1.5 text-[var(--color-arena)] transition hover:bg-[color-mix(in_oklch,var(--color-arena)_22%,transparent)]"
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

function Team({ team, align }: { team: HeroTeam; align: "start" | "end" }) {
  const flip = align === "end" ? "flex-row-reverse text-right" : "";
  return (
    <span className={`flex min-w-0 items-center gap-2.5 ${flip}`}>
      <TeamFlag code={team?.code} size={44} className="shrink-0" />
      <span className="block min-w-0 truncate font-display text-2xl tracking-tight sm:text-3xl">
        {team?.name ?? "TBD"}
      </span>
    </span>
  );
}

function Segment({ value, label, dim }: { value: string; label: string; dim?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`font-display tabular leading-none tracking-tighter text-[3.25rem] sm:text-[4.5rem] ${
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
