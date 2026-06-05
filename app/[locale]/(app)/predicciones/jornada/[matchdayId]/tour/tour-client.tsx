"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Calendar, MapPin } from "lucide-react";
import { TeamFlag } from "@/components/brand/team-flag";
import { ScoreStepper } from "@/components/forms/score-stepper";
import { WinnerPicker } from "@/components/predictions/winner-picker";
import {
  InteractiveTourShell,
  flashSavedToast,
} from "@/components/predictions/interactive-tour-shell";
import { cn, formatDateTime } from "@/lib/utils";
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

const STAGE_LABEL_KEY: Record<MatchItem["stage"], string> = {
  group: "stGroup",
  r32: "stR32",
  r16: "stR16",
  qf: "stQf",
  sf: "stSf",
  third: "stThird",
  final: "stFinal",
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
  const t = useTranslations("predMatchday");
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
  // Ruleta vertical (solo Marcador / Solo Ganador): fase de salida del
  // paso actual antes de commitear el siguiente. 170ms de exit + entrada
  // animada del nuevo = la rueda "gira".
  const wheelMode = mode !== "completo";
  const [wheelLeaving, setWheelLeaving] = useState(false);
  const toldEntryToast = useRef(false);
  // Guardados en vuelo (en segundo plano). Al finalizar esperamos a que
  // terminen + un guardado masivo de respaldo, para no perder nada.
  const pendingSaves = useRef<Set<Promise<unknown>>>(new Set());

  useEffect(() => {
    if (toldEntryToast.current) return;
    toldEntryToast.current = true;
    if (allCompleteOnEntry) {
      toast(t("tourEntryToast", { n: matches.length }), {
        description: t("tourEntryDesc"),
      });
    }
  }, [allCompleteOnEntry, matches.length, t]);

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

  // Cambia de paso. En la ruleta, primero deja salir al actual (fase
  // "leaving") y luego conmuta — la entrada la anima el key remount.
  function commitStep(dir: "left" | "right", nextStep: number) {
    setDirection(dir);
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!wheelMode || reduceMotion) {
      setStep(nextStep);
      return;
    }
    setWheelLeaving(true);
    window.setTimeout(() => {
      setWheelLeaving(false);
      setStep(nextStep);
    }, 170);
  }

  function onPrev() {
    if (step === 0 || wheelLeaving) return;
    const p = preds[current.id];
    // Solo guardamos si el paso ya es válido; volver atrás nunca bloquea.
    if (!blockReason(p)) queueSave(current.id, p);
    commitStep("left", step - 1);
  }

  function onNext() {
    if (wheelLeaving) return;
    const p = preds[current.id];
    const reason = blockReason(p);
    if (reason === "scorer") {
      toast.warning(t("warnScorerTitle"), {
        description: t("warnScorerDesc"),
      });
      return;
    }
    if (reason === "picked") {
      toast.warning(t("warnPickedTitle"), {
        description: t("warnPickedDesc"),
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
    commitStep("right", step + 1);
  }

  const prevMatch = step > 0 ? matches[step - 1] : null;
  const nextMatch = step < matches.length - 1 ? matches[step + 1] : null;

  const isKnockout = current.stage !== "group";
  const stageEyebrow = current.groupCode
    ? t("groupWithCode", { code: current.groupCode })
    : t(STAGE_LABEL_KEY[current.stage]);

  // El paso a paso NO muestra "cuánto puntúa este paso": metía ruido. Las
  // reglas viven fuera del tour (página de jornada y /puntuacion).

  return (
    <InteractiveTourShell
      title={matchdayName}
      currentStep={step}
      totalSteps={matches.length}
      onPrev={onPrev}
      onNext={onNext}
      direction={direction}
      finishLabel={t("finish")}
      pending={pending}
      // Marcador y Solo Ganador tienen poca info: centramos en vertical para
      // que no quede pegada arriba con un hueco hasta "Siguiente".
      centerBody={mode === "marcador" || mode === "solo_ganador"}
      // La ruleta gestiona su propia transición vertical; el slide
      // horizontal del shell solo aplica al modo Completo.
      bodyAnimation={wheelMode ? "none" : "slide"}
    >
      <div className={wheelMode ? "relative w-full [perspective:1100px]" : "contents"}>
        {wheelMode ? (
          <WheelPlate
            match={prevMatch}
            pred={prevMatch ? preds[prevMatch.id] : undefined}
            slot="prev"
            leaving={wheelLeaving}
            direction={direction}
            soloGanador={soloGanador}
            stepNumber={step > 0 ? step : null}
          />
        ) : null}
        <div
          key={current.id}
          className={
            wheelMode
              ? cn(
                  "wheel-card relative z-10",
                  wheelLeaving
                    ? direction === "right"
                      ? "wheel-leave-up"
                      : "wheel-leave-down"
                    : direction === "right"
                      ? "wheel-enter-up"
                      : "wheel-enter-down",
                )
              : "contents"
          }
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
                  {t("vs")}
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

            {/* Marcador — steppers grandes (paso a paso) */}
            <section className="flex items-center justify-center gap-2 sm:gap-5">
              <div className="flex flex-col items-center gap-2">
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                  {current.home?.code ?? "—"}
                </p>
                <ScoreStepper
                  size="lg"
                  value={currentPred.homeScore}
                  onChange={(v) => updateCurrent({ homeScore: v })}
                  ariaLabel={t("goalsAria", { team: current.home?.name ?? t("localFallback") })}
                />
              </div>
              <span className="font-display text-3xl text-[var(--color-muted-foreground)] sm:text-4xl">—</span>
              <div className="flex flex-col items-center gap-2">
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                  {current.away?.code ?? "—"}
                </p>
                <ScoreStepper
                  size="lg"
                  value={currentPred.awayScore}
                  onChange={(v) => updateCurrent({ awayScore: v })}
                  ariaLabel={t("goalsAria", { team: current.away?.name ?? t("awayFallback") })}
                />
              </div>
            </section>

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
                  {t("goesToPens")}
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
                    <option value="">{t("qualifiedByPens")}</option>
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
                    {t("scorerLabel")}
                  </p>
                  <p className="mt-1 font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                    {t("scorerHint")}
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
                    {t("teamsTBD")}
                  </p>
                )}
              </section>
            ) : null}
          </>
        )}
      </div>
        </div>
        {wheelMode ? (
          <WheelPlate
            match={nextMatch}
            pred={nextMatch ? preds[nextMatch.id] : undefined}
            slot="next"
            leaving={wheelLeaving}
            direction={direction}
            soloGanador={soloGanador}
            stepNumber={step < matches.length - 1 ? step + 2 : null}
          />
        ) : null}
      </div>
    </InteractiveTourShell>
  );
}

/**
 * Placa de la ruleta: resumen compacto del partido anterior/siguiente
 * (banderas, códigos y la predicción actual), inclinada en 3D, apagada y
 * con blur. Durante la fase "leaving", la placa que va a convertirse en
 * el paso actual se "promociona" (se acerca, gana foco) y la que sale del
 * trío se desvanece — la rueda gira. Si no hay partido (primer/último
 * paso), reserva el hueco para que el centro no salte.
 */
function WheelPlate({
  match,
  pred,
  slot,
  leaving,
  direction,
  soloGanador,
  stepNumber,
}: {
  match: MatchItem | null;
  pred: LocalPrediction | undefined;
  slot: "prev" | "next";
  leaving: boolean;
  direction: "left" | "right";
  soloGanador: boolean;
  stepNumber: number | null;
}) {
  if (!match) {
    return <div aria-hidden className={slot === "prev" ? "mb-8 h-16" : "mt-8 h-16"} />;
  }

  // Avanzando (right) se promociona la placa de abajo; volviendo (left),
  // la de arriba. La otra se degrada.
  const promote = leaving && slot === (direction === "right" ? "next" : "prev");
  const demote = leaving && !promote;

  const pick = (() => {
    if (!pred) return "—";
    if (soloGanador) {
      if (!pred.picked) return "—";
      if (pred.winnerTeamId == null) return "X";
      if (match.home && pred.winnerTeamId === match.home.id) return "1";
      if (match.away && pred.winnerTeamId === match.away.id) return "2";
      return "X";
    }
    return `${pred.homeScore} – ${pred.awayScore}`;
  })();

  return (
    <div
      aria-hidden
      className={cn(
        "wheel-plate pointer-events-none flex h-16 select-none items-center justify-center gap-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-5",
        slot === "prev" ? "wheel-plate-prev mb-8" : "wheel-plate-next mt-8",
        promote && "wheel-plate-promote",
        demote && "wheel-plate-demote",
      )}
    >
      <span className="w-6 text-right font-mono text-[0.55rem] tabular text-[var(--color-muted-foreground)]">
        {stepNumber != null ? String(stepNumber).padStart(2, "0") : ""}
      </span>
      {match.home ? <TeamFlag code={match.home.code} size={26} /> : null}
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        {match.home?.code ?? "—"}
      </span>
      <span className="min-w-16 text-center font-display text-2xl tabular tracking-tight">
        {pick}
      </span>
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        {match.away?.code ?? "—"}
      </span>
      {match.away ? <TeamFlag code={match.away.code} size={26} /> : null}
      <span aria-hidden className="w-6" />
    </div>
  );
}
