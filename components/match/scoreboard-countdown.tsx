"use client";

import { useEffect, useState } from "react";

/**
 * Cuenta atrás en vivo, PROMINENTE, para el centro del marcador cuando el
 * partido aún no ha empezado. Tictac cada segundo. Los textos llegan ya
 * traducidos (props) para que funcione con cualquier idioma.
 */
export function ScoreboardCountdown({
  kickoffISO,
  startsIn,
  units,
}: {
  kickoffISO: string;
  startsIn: string;
  units: { d: string; h: string; m: string; s: string };
}) {
  const target = new Date(kickoffISO).getTime();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const total = remaining == null ? null : Math.max(0, Math.floor(remaining / 1000));
  const d = total == null ? null : Math.floor(total / 86400);
  const h = total == null ? null : Math.floor((total % 86400) / 3600);
  const m = total == null ? null : Math.floor((total % 3600) / 60);
  const s = total == null ? null : total % 60;
  const pad = (n: number | null) => (n == null ? "--" : n.toString().padStart(2, "0"));

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-[var(--color-muted-foreground)]">
        {startsIn}
      </span>
      <span className="font-display tabular glow-arena text-2xl leading-none tracking-tighter text-[var(--color-arena)] sm:text-5xl">
        {d != null && d > 0
          ? `${d}${units.d} ${pad(h)}${units.h}`
          : `${pad(h)}:${pad(m)}:${pad(s)}`}
      </span>
    </div>
  );
}
