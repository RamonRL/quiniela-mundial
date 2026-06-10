"use client";

import { useEffect, useState } from "react";
import { TeamFlag } from "@/components/brand/team-flag";
import type { HeroMatch, HeroTeam } from "./hero-card";

/**
 * Tira secundaria de contexto bajo el protagonista: partidos vecinos (anterior,
 * posterior, próximos) en formato compacto y de bajo énfasis. Apila en móvil y
 * se pone en fila en pantallas anchas. Los upcoming con `kickoffISO` muestran un
 * mini-contador en vivo.
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
  const { home, away, status, homeScore, awayScore, code, kickoffISO, dateLabel, note } = match;
  const finished = status === "finished";
  const live = status === "live";
  const winner =
    finished && homeScore != null && awayScore != null
      ? homeScore > awayScore
        ? "home"
        : awayScore > homeScore
          ? "away"
          : "draw"
      : null;

  return (
    <div className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
          {code}
          {note ? ` ${note}` : ""}
        </span>
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          {finished ? "Final" : live ? "En vivo" : kickoffISO ? <Mini kickoffISO={kickoffISO} /> : dateLabel ?? ""}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Side team={home} align="start" dim={winner === "away"} />
        <span className="font-display tabular text-base leading-none text-[var(--color-foreground)]">
          {finished || live ? (
            <>
              {homeScore ?? 0}
              <span className="mx-0.5 text-[var(--color-muted-foreground)] opacity-50">·</span>
              {awayScore ?? 0}
            </>
          ) : (
            <span className="text-xs text-[var(--color-muted-foreground)]">vs</span>
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
  const label = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}:${s.toString().padStart(2, "0")}`;
  return <span className="tabular text-[var(--color-arena)]">{label}</span>;
}

function Side({ team, align, dim }: { team: HeroTeam; align: "start" | "end"; dim: boolean }) {
  const flip = align === "end" ? "flex-row-reverse text-right" : "";
  return (
    <span className={`flex min-w-0 items-center gap-1.5 ${flip} ${dim ? "opacity-55" : ""}`}>
      <TeamFlag code={team?.code} size={20} className="shrink-0" />
      <span className="truncate text-xs font-medium">{team?.name ?? "TBD"}</span>
    </span>
  );
}
