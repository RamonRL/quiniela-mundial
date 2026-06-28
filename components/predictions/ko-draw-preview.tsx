"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { WinnerPicker, type WinnerValue } from "@/components/predictions/winner-picker";
import { PensWinnerPicker } from "@/components/predictions/pens-winner-picker";
import { ScoreStepper } from "@/components/forms/score-stepper";
import { TeamFlag } from "@/components/brand/team-flag";

/**
 * Preview (solo admin): cómo se ve el paso a paso de un partido de ELIMINATORIA
 * con un EMPATE predicho en los 3 modos, para revisar la selección del ganador
 * a penaltis. Reutiliza los mismos componentes de input que el tour real
 * (WinnerPicker, ScoreStepper) con estado local. No guarda nada.
 */

const HOME = { id: 1, code: "BRA", name: "Brasil" };
const AWAY = { id: 2, code: "ARG", name: "Argentina" };

export function KoDrawPreview() {
  const t = useTranslations("predMatchday");
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ModeCard label="Solo ganador" note={t("ko120Note")}>
        <SoloDemo />
      </ModeCard>
      <ModeCard label="Marcador" note={t("ko120Note")}>
        <ScoreDemo withScorer={false} />
      </ModeCard>
      <ModeCard label="Completo" note={t("ko120Note")}>
        <ScoreDemo withScorer />
      </ModeCard>
    </div>
  );
}

function ModeCard({
  label,
  note,
  children,
}: {
  label: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <header className="space-y-1 text-center">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
          Dieciseisavos · {label}
        </p>
        <p className="flex items-center justify-center gap-2 font-display text-lg tracking-tight">
          <TeamFlag code={HOME.code} size={20} /> {HOME.name}
          <span className="font-mono text-[0.6rem] uppercase text-[var(--color-muted-foreground)]">vs</span>
          {AWAY.name} <TeamFlag code={AWAY.code} size={20} />
        </p>
      </header>
      <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-3 py-2 text-center font-editorial text-xs italic text-[var(--color-muted-foreground)]">
        {note}
      </p>
      {children}
    </div>
  );
}

/** Solo Ganador: WinnerPicker con "X" (empate) → aparecen los botones de penaltis. */
function SoloDemo() {
  const [value, setValue] = useState<WinnerValue>({
    homeScore: 0,
    awayScore: 0,
    willGoToPens: true,
    winnerTeamId: HOME.id,
    picked: true,
  });
  return (
    <WinnerPicker
      home={HOME}
      away={AWAY}
      value={value}
      isKnockout
      variant="card"
      onChange={(patch) => setValue((v) => ({ ...v, ...patch }))}
    />
  );
}

/** Marcador / Completo: marcador 1-1 → aparece el selector de penaltis al empatar. */
function ScoreDemo({ withScorer }: { withScorer: boolean }) {
  const t = useTranslations("predMatchday");
  const [home, setHome] = useState(1);
  const [away, setAway] = useState(1);
  const [winnerId, setWinnerId] = useState<number | null>(HOME.id);
  const isDraw = home === away;

  return (
    <div className="space-y-4">
      <section className="flex items-center justify-center gap-3">
        <div className="flex flex-col items-center gap-1.5">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
            {HOME.code}
          </span>
          <ScoreStepper value={home} onChange={setHome} ariaLabel={`Goles ${HOME.name}`} />
        </div>
        <span className="font-display text-2xl text-[var(--color-muted-foreground)]">—</span>
        <div className="flex flex-col items-center gap-1.5">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
            {AWAY.code}
          </span>
          <ScoreStepper value={away} onChange={setAway} ariaLabel={`Goles ${AWAY.name}`} />
        </div>
      </section>

      {/* En KO, el selector de quién pasa aparece automáticamente al empatar. */}
      {isDraw ? (
        <PensWinnerPicker
          home={HOME}
          away={AWAY}
          winnerTeamId={winnerId}
          onPick={(teamId) => setWinnerId(teamId)}
        />
      ) : (
        <p className="text-center font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          (pon un empate para elegir quién pasa en penaltis)
        </p>
      )}

      {withScorer ? (
        <section className="space-y-1 border-t border-[var(--color-border)] pt-3 text-center">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            {t("scorerLabel")}
          </p>
          <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
            En modo Completo, aquí se elige además el goleador del partido.
          </p>
        </section>
      ) : null}
    </div>
  );
}
