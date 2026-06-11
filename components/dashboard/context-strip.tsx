"use client";

import { useEffect, useState } from "react";
import { TeamFlag } from "@/components/brand/team-flag";
import { roundOrGroupLabel, type HeroMatch, type HeroTeam } from "./hero-card";

/**
 * Tira secundaria de contexto bajo el protagonista: partidos vecinos (anterior,
 * posterior, próximos) en formato compacto y de bajo énfasis. Apila en móvil y
 * se pone en fila en pantallas anchas. Los upcoming con `kickoffISO` muestran un
 * mini-contador en vivo. Etiqueta = grupo (fase de grupos) o ronda (KO).
 */
export function ContextStrip({ rows }: { rows: HeroMatch[] }) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row">
      {rows.map((r) => (
        <Chip key={r.code} match={r} />
      ))}
    </div>
  );
}

function Chip({ match }: { match: HeroMatch }) {
  const { home, away, status, homeScore, awayScore, kickoffISO, dateLabel, note } = match;
  const finished = status === "finished";
  const live = status === "live";
  const label = roundOrGroupLabel(match);
  const winner =
    finished && homeScore != null && awayScore != null
      ? homeScore > awayScore
        ? "home"
        : awayScore > homeScore
          ? "away"
          : "draw"
      : null;

  return (
    <div className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-3.5 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {label}
          {note ? ` ${note}` : ""}
        </span>
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          {finished ? "Final" : live ? "En vivo" : kickoffISO ? <Mini kickoffISO={kickoffISO} /> : dateLabel ?? ""}
        </span>
      </div>
      <div className="flex items-center justify-center gap-2.5">
        <Side team={home} align="start" dim={winner === "away"} />
        <span className="shrink-0 font-display tabular text-xl leading-none tracking-tight">
          {finished || live ? (
            <>
              {homeScore ?? 0}
              <span className="mx-0.5 text-[var(--color-muted-foreground)] opacity-50">·</span>
              {awayScore ?? 0}
            </>
          ) : (
            <span className="font-mono text-xs text-[var(--color-muted-foreground)]">vs</span>
          )}
        </span>
        <Side team={away} align="end" dim={winner === "home"} />
      </div>
    </div>
  );
}

function Mini({ kickoffISO }: { kickoffISO: string }) {
  const target = new Date(kickoffISO).getTime();
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  if (remaining == null) return <span className="tabular">--</span>;
  const t = Math.max(0, Math.floor(remaining / 1000));
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const lbl = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}:${s.toString().padStart(2, "0")}`;
  return <span className="tabular text-[var(--color-arena)]">{lbl}</span>;
}

function Side({ team, align, dim }: { team: HeroTeam; align: "start" | "end"; dim: boolean }) {
  const nameEl = (
    <span className="truncate font-display text-base leading-[0.95] tracking-tight sm:text-lg">
      {team?.name ?? "TBD"}
    </span>
  );
  const flagEl = <TeamFlag code={team?.code} size={22} className="shrink-0" />;
  return (
    <span
      className={`flex min-w-0 flex-1 items-center gap-1.5 ${
        align === "start" ? "justify-end text-right" : "justify-start text-left"
      } ${dim ? "opacity-55" : ""}`}
    >
      {align === "start" ? (
        <>
          {flagEl}
          {nameEl}
        </>
      ) : (
        <>
          {nameEl}
          {flagEl}
        </>
      )}
    </span>
  );
}
