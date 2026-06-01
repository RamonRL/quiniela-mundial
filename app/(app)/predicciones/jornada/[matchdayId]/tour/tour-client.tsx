"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, MapPin } from "lucide-react";
import { TeamFlag } from "@/components/brand/team-flag";
import { ScoreStepper } from "@/components/forms/score-stepper";
import { PointsHint, type PointsHintItem } from "@/components/predictions/points-hint";
import { WinnerPicker } from "@/components/predictions/winner-picker";
import {
  InteractiveTourShell,
  flashSavedToast,
} from "@/components/predictions/interactive-tour-shell";
import { formatDateTime } from "@/lib/utils";
import type { PredictionMode } from "@/lib/prediction-modes";
import { ScorerPicker, type PlayerCardData } from "./scorer-picker";
import { saveMatchPrediction } from "./actions";
import { saveMatchdayPredictions } from "../actions";

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
  /** Solo Ganador: ¿ya eligió 1/X/2? Distingue el empate del 0-0 inicial. */
  picked: boolean;
};

export function MatchdayTourClient({
  matchdayId,
  matchdayName,
  matches,
  initialStep,
  allCompleteOnEntry,
  mode,
}: {
  matchdayId: number;
  matchdayName: string;
  matches: MatchItem[];
  initialStep: number;
  allCompleteOnEntry: boolean;
  mode: PredictionMode;
}) {
  const soloGanador = mode === "solo_ganador";
  const showScorer = mode === "completo";

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
        picked: m.existing != null,
      };
    }
    return out;
  });
  const [pending, startTransition] = useTransition();
  const toldEntryToast = useRef(false);
  // Guardados en vuelo (en segundo plano). Al finalizar esperamos a que
  // terminen + un guardado masivo de respaldo, para no perder nada.
  const pendingSaves = useRef<Set<Promise<unknown>>>(new Set());

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

  // Validación 100% en cliente (instantánea). Devuelve el motivo por el que
  // NO se puede avanzar, o null si está listo.
  function blockReason(p: LocalPrediction | undefined): "missing" | "scorer" | "picked" | null {
    if (!p) return "missing";
    if (showScorer && p.scorerPlayerId == null) return "scorer";
    if (soloGanador && !p.picked) return "picked";
    return null;
  }

  // Guarda un partido en SEGUNDO PLANO: no bloqueamos la navegación esperando
  // al servidor. El upsert es idempotente (usuario+liga+partido), así que
  // reintentos o guardados solapados no duplican. Si falla, no molestamos: el
  // guardado masivo de `flushAll` al finalizar lo recupera.
  function queueSave(matchId: number, p: LocalPrediction) {
    const promise = saveMatchPrediction({
      matchId,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      willGoToPens: p.willGoToPens,
      winnerTeamId: p.winnerTeamId,
      scorerPlayerId: showScorer ? p.scorerPlayerId : null,
    })
      .then((res) => {
        if (res.ok) flashSavedToast();
      })
      .catch(() => {})
      .finally(() => pendingSaves.current.delete(promise));
    pendingSaves.current.add(promise);
  }

  // Red de seguridad al terminar: espera los guardados en vuelo y persiste
  // toda la jornada de una sola vez (idempotente) por si alguno de fondo falló.
  async function flushAll() {
    await Promise.allSettled([...pendingSaves.current]);
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        matchdayId,
        predictions: matches.map((m) => {
          const p = preds[m.id];
          return {
            matchId: m.id,
            homeScore: p.homeScore,
            awayScore: p.awayScore,
            willGoToPens: p.willGoToPens,
            winnerTeamId: p.winnerTeamId,
            scorerPlayerId: showScorer ? p.scorerPlayerId : null,
            picked: p.picked,
          };
        }),
      }),
    );
    await saveMatchdayPredictions({ ok: false }, fd);
  }

  function onPrev() {
    if (step === 0) return;
    const p = preds[current.id];
    // Solo guardamos si el paso ya es válido; volver atrás nunca bloquea.
    if (!blockReason(p)) queueSave(current.id, p);
    setDirection("left");
    setStep((s) => s - 1);
  }

  function onNext() {
    const p = preds[current.id];
    const reason = blockReason(p);
    if (reason === "scorer") {
      toast.warning("Selecciona un goleador.", {
        description:
          "Aunque tu marcador sea 0-0, acertarlo te da +4 puntos extra. Nunca penaliza.",
      });
      return;
    }
    if (reason === "picked") {
      toast.warning("Elige un resultado.", {
        description: "Pulsa 1 (local), X (empate) o 2 (visitante) para continuar.",
      });
      return;
    }
    if (reason) return;

    // Guardado en segundo plano + avance INMEDIATO (sin esperar al servidor).
    queueSave(current.id, p);

    if (step === matches.length - 1) {
      // Último paso: aquí sí esperamos a que todo quede persistido.
      startTransition(async () => {
        await flushAll();
        router.push("/predicciones");
      });
      return;
    }
    setDirection("right");
    setStep((s) => s + 1);
  }

  const isKnockout = current.stage !== "group";
  const stageEyebrow = current.groupCode
    ? `Grupo ${current.groupCode}`
    : STAGE_LABEL[current.stage];

  // Tabla de puntuación de este partido, según el modo.
  const pointsHintItems: PointsHintItem[] = [];
  if (mode === "solo_ganador") {
    pointsHintItems.push({ points: 3, label: "Aciertas el ganador (o el empate)" });
    if (isKnockout) {
      pointsHintItems.push({
        points: 2,
        prefix: "+",
        label: "Empate: aciertas quién pasa en penaltis",
        bonus: true,
      });
    }
  } else {
    pointsHintItems.push(
      { points: 5, label: "Marcador exacto" },
      { points: 2, label: "Aciertas ganador (o empate) sin el marcador exacto" },
    );
    if (mode === "completo") {
      pointsHintItems.push(
        { points: 4, label: "Tu goleador marca un gol" },
        { points: 2, prefix: "+", label: "Bonus si además es el primer gol del partido", bonus: true },
      );
    }
    if (isKnockout) {
      pointsHintItems.push(
        { points: 3, prefix: "+", label: "Bonus si aciertas el clasificado a la siguiente ronda", bonus: true },
        { points: 2, prefix: "+", label: "Bonus si predices que va a penaltis y ocurre", bonus: true },
      );
    }
  }

  const hintFootnote =
    mode === "solo_ganador"
      ? isKnockout
        ? "Hasta 5 pts en este partido de eliminatoria."
        : "Hasta 3 pts en este partido de la fase de grupos."
      : mode === "marcador"
        ? isKnockout
          ? "Hasta 10 pts en este partido de eliminatoria."
          : "Hasta 5 pts en este partido de la fase de grupos."
        : isKnockout
          ? "Hasta 16 pts en este partido de eliminatoria."
          : "Hasta 11 pts en este partido de la fase de grupos.";

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
        {soloGanador ? (
          /* ── Solo Ganador: la quiniela 1·X·2 a pantalla completa ── */
          <>
            <header className="text-center">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
                {stageEyebrow}
              </p>
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

            <div className="mx-auto w-full max-w-md">
              <WinnerPicker
                home={current.home}
                away={current.away}
                value={currentPred}
                isKnockout={isKnockout}
                variant="tour"
                onChange={(patch) => updateCurrent(patch)}
              />
            </div>

            <PointsHint items={pointsHintItems} footnote={hintFootnote} />
          </>
        ) : (
          /* ── Completo / Marcador: marcador exacto (+ goleador en completo) ── */
          <>
            <header className="text-center">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
                {stageEyebrow}
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

            <PointsHint items={pointsHintItems} footnote={hintFootnote} />

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

            {/* Goleador (solo completo) */}
            {showScorer ? (
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
            ) : null}
          </>
        )}
      </div>
    </InteractiveTourShell>
  );
}
