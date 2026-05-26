"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, MapPin } from "lucide-react";
import { TeamFlag } from "@/components/brand/team-flag";
import { ScoreStepper } from "@/components/forms/score-stepper";
import { PointsHint, type PointsHintItem } from "@/components/predictions/points-hint";
import {
  InteractiveTourShell,
  flashSavedToast,
} from "@/components/predictions/interactive-tour-shell";
import { formatDateTime } from "@/lib/utils";
import { ScorerPicker, type PlayerCardData } from "./scorer-picker";
import { endMatchdayTour, saveMatchPrediction } from "./actions";

type TeamLite = { id: number; code: string; name: string };
type MatchItem = {
  id: number;
  stage: "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
  groupCode: string | null;
  scheduledAt: string;
  venue: string | null;
  home: TeamLite | null;
  away: TeamLite | null;
  homePlayers: PlayerCardData[];
  awayPlayers: PlayerCardData[];
  existing: {
    homeScore: number;
    awayScore: number;
    willGoToPens: boolean;
    winnerTeamId: number | null;
  } | null;
  existingScorerPlayerId: number | null;
};

const STAGE_LABEL: Record<MatchItem["stage"], string> = {
  group: "Grupo",
  r32: "16avos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semis",
  third: "3er puesto",
  final: "Final",
};

type LocalPrediction = {
  homeScore: number;
  awayScore: number;
  willGoToPens: boolean;
  winnerTeamId: number | null;
  scorerPlayerId: number | null;
};

export function MatchdayTourClient({
  matchdayId,
  matchdayName,
  matches,
  initialStep,
  allCompleteOnEntry,
}: {
  matchdayId: number;
  matchdayName: string;
  matches: MatchItem[];
  initialStep: number;
  allCompleteOnEntry: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [preds, setPreds] = useState<Record<number, LocalPrediction>>(() => {
    const out: Record<number, LocalPrediction> = {};
    for (const m of matches) {
      out[m.id] = {
        homeScore: m.existing?.homeScore ?? 0,
        awayScore: m.existing?.awayScore ?? 0,
        willGoToPens: m.existing?.willGoToPens ?? false,
        winnerTeamId: m.existing?.winnerTeamId ?? null,
        scorerPlayerId: m.existingScorerPlayerId,
      };
    }
    return out;
  });
  const [pending, startTransition] = useTransition();
  const toldEntryToast = useRef(false);

  useEffect(() => {
    if (toldEntryToast.current) return;
    toldEntryToast.current = true;
    if (allCompleteOnEntry) {
      toast(`Ya predijiste los ${matches.length} partidos.`, {
        description: "Revisa o cierra cuando quieras. Auto-guardado al pasar.",
      });
    }
  }, [allCompleteOnEntry, matches.length]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("step") !== String(step)) {
      url.searchParams.set("step", String(step));
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [step, router]);

  const current = matches[step];
  if (!current) return null;
  const currentPred = preds[current.id];

  function updateCurrent(patch: Partial<LocalPrediction>) {
    setPreds((prev) => ({
      ...prev,
      [current.id]: { ...prev[current.id], ...patch },
    }));
  }

  async function persistCurrent(): Promise<boolean> {
    const p = preds[current.id];
    if (!p) return false;
    if (p.scorerPlayerId == null) {
      toast.warning("Selecciona un goleador.", {
        description:
          "Aunque tu marcador sea 0-0, acertarlo te da +4 puntos extra. Nunca penaliza.",
      });
      return false;
    }
    const res = await saveMatchPrediction({
      matchId: current.id,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      willGoToPens: p.willGoToPens,
      winnerTeamId: p.winnerTeamId,
      scorerPlayerId: p.scorerPlayerId,
    });
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo guardar.");
      return false;
    }
    flashSavedToast();
    return true;
  }

  function onPrev() {
    if (step === 0) return;
    startTransition(async () => {
      const ok = await persistCurrent();
      if (!ok) return;
      setDirection("left");
      setStep((s) => s - 1);
    });
  }

  function onNext() {
    const isLast = step === matches.length - 1;
    startTransition(async () => {
      const ok = await persistCurrent();
      if (!ok) return;
      if (isLast) {
        await endMatchdayTour(matchdayId);
        router.push("/predicciones");
        return;
      }
      setDirection("right");
      setStep((s) => s + 1);
    });
  }

  const isKnockout = current.stage !== "group";

  // Tabla de puntuación de este partido. En grupos: marcador + goleador.
  // En knockout: añadimos los bonuses específicos de eliminatoria.
  const pointsHintItems: PointsHintItem[] = [
    { points: 5, label: "Marcador exacto" },
    { points: 2, label: "Aciertas ganador (o empate) sin el marcador exacto" },
    { points: 4, label: "Tu goleador marca un gol" },
    { points: 2, prefix: "+", label: "Bonus si además es el primer gol del partido", bonus: true },
  ];
  if (isKnockout) {
    pointsHintItems.push(
      { points: 3, prefix: "+", label: "Bonus si aciertas el clasificado a la siguiente ronda", bonus: true },
      { points: 2, prefix: "+", label: "Bonus si predices que va a penaltis y ocurre", bonus: true },
    );
  }

  return (
    <InteractiveTourShell
      title={matchdayName}
      currentStep={step}
      totalSteps={matches.length}
      onPrev={onPrev}
      onNext={onNext}
      direction={direction}
      finishLabel="Finalizar"
      pending={pending}
    >
      <div className="space-y-6">
        <header className="text-center">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
            {current.groupCode ? `Grupo ${current.groupCode}` : STAGE_LABEL[current.stage]}
          </p>
          <div className="mt-3 flex items-center justify-center gap-3 text-lg sm:text-xl">
            {current.home ? (
              <span className="flex items-center gap-2">
                <TeamFlag code={current.home.code} size={32} />
                <span className="font-display tracking-tight">{current.home.name}</span>
              </span>
            ) : null}
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              vs
            </span>
            {current.away ? (
              <span className="flex items-center gap-2">
                <span className="font-display tracking-tight">{current.away.name}</span>
                <TeamFlag code={current.away.code} size={32} />
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex items-center justify-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3" />
              {formatDateTime(current.scheduledAt, {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {current.venue ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3" />
                {current.venue}
              </span>
            ) : null}
          </div>
        </header>

        {/* Marcador */}
        <section className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              {current.home?.code ?? "—"}
            </p>
            <ScoreStepper
              value={currentPred.homeScore}
              onChange={(v) => updateCurrent({ homeScore: v })}
              ariaLabel={`Goles ${current.home?.name ?? "local"}`}
            />
          </div>
          <span className="font-display text-3xl text-[var(--color-muted-foreground)]">—</span>
          <div className="flex flex-col items-center gap-2">
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              {current.away?.code ?? "—"}
            </p>
            <ScoreStepper
              value={currentPred.awayScore}
              onChange={(v) => updateCurrent({ awayScore: v })}
              ariaLabel={`Goles ${current.away?.name ?? "visitante"}`}
            />
          </div>
        </section>

        <PointsHint
          items={pointsHintItems}
          footnote={
            isKnockout
              ? "Hasta 16 pts en este partido de eliminatoria."
              : "Hasta 11 pts en este partido de la fase de grupos."
          }
        />

        {/* Penaltis (solo KO) */}
        {isKnockout ? (
          <section className="flex items-center justify-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-arena)]"
                checked={currentPred.willGoToPens}
                onChange={(e) => updateCurrent({ willGoToPens: e.target.checked })}
              />
              Se va a penaltis
            </label>
            {currentPred.willGoToPens && current.home && current.away ? (
              <select
                value={currentPred.winnerTeamId ?? ""}
                onChange={(e) =>
                  updateCurrent({
                    winnerTeamId: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
              >
                <option value="">Clasificado por penaltis…</option>
                <option value={current.home.id}>{current.home.name}</option>
                <option value={current.away.id}>{current.away.name}</option>
              </select>
            ) : null}
          </section>
        ) : null}

        {/* Goleador */}
        <section className="space-y-3 border-t border-[var(--color-border)] pt-5">
          <div className="text-center">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Goleador del partido
            </p>
            <p className="mt-1 font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              Acertar +4 pts · Aunque marques 0-0, acertar un goleador suma extra. Nunca penaliza.
            </p>
          </div>
          {current.home && current.away ? (
            <ScorerPicker
              home={current.home}
              away={current.away}
              homePlayers={current.homePlayers}
              awayPlayers={current.awayPlayers}
              selectedId={currentPred.scorerPlayerId}
              onSelect={(playerId) => updateCurrent({ scorerPlayerId: playerId })}
            />
          ) : (
            <p className="text-center text-sm italic text-[var(--color-muted-foreground)]">
              Los equipos se conocerán cuando avance el bracket.
            </p>
          )}
        </section>
      </div>
    </InteractiveTourShell>
  );
}
