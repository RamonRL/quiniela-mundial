"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Calendar, MapPin } from "lucide-react";
import { TeamFlag } from "@/components/brand/team-flag";
import { ScoreStepper } from "@/components/forms/score-stepper";
import { WinnerPicker } from "@/components/predictions/winner-picker";
import { PensWinnerPicker } from "@/components/predictions/pens-winner-picker";
import {
  InteractiveTourShell,
  flashSavedToast,
} from "@/components/predictions/interactive-tour-shell";
import { useDateFormat } from "@/components/shell/timezone-provider";
import { cn, formatDateTime } from "@/lib/utils";
import type { PredictionMode } from "@/lib/prediction-modes";
import { ScorerPicker, type PlayerCardData } from "./scorer-picker";
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
  const { timeZone, locale } = useDateFormat();
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
  // Autosave con debounce: en vez de un guardado por paso (que disparaba ~23
  // server actions concurrentes, saturaba el pool de conexiones y colgaba el
  // "Guardando…" indefinidamente), coalesce los cambios en UN guardado masivo
  // idempotente cuando el usuario hace una pausa.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Limpia el timer de autosave al desmontar.
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

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

  // Construye el payload de la jornada con las predicciones LISTAS (sin motivo
  // de bloqueo). Al finalizar todas lo están; a mitad de tour, las hechas.
  function buildReadyPayload(): { count: number; fd: FormData } {
    const ready = matches.filter((m) => !blockReason(preds[m.id]));
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        matchdayId,
        predictions: ready.map((m) => {
          const p = preds[m.id];
          // willGoToPens se deriva del empate en KO (un eliminatorio no acaba en
          // tablas): autoritativo, sin depender de un checkbox manual.
          const willGoToPens = m.stage !== "group" && p.homeScore === p.awayScore;
          return {
            matchId: m.id,
            homeScore: p.homeScore,
            awayScore: p.awayScore,
            willGoToPens,
            winnerTeamId: willGoToPens ? p.winnerTeamId : null,
            scorerPlayerId: showScorer ? p.scorerPlayerId : null,
            picked: p.picked,
          };
        }),
      }),
    );
    return { count: ready.length, fd };
  }

  // Guardado masivo idempotente en UNA sola server action (todas las listas).
  async function bulkSave(): Promise<{ ok: boolean; error?: string }> {
    const { count, fd } = buildReadyPayload();
    if (count === 0) return { ok: true };
    return saveMatchdayPredictions({ ok: false }, fd);
  }

  // Autosave en segundo plano con debounce: cancela el anterior y reprograma,
  // así una ráfaga de pasos rápidos se convierte en UN guardado al hacer pausa.
  function scheduleAutosave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      bulkSave()
        .then((r) => {
          if (r.ok) flashSavedToast();
        })
        .catch(() => {});
    }, 1200);
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
    if (!blockReason(p)) scheduleAutosave();
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

    if (step === matches.length - 1) {
      // Último paso: cancelamos el autosave pendiente y persistimos todo en UN
      // guardado masivo. Con timeout duro + manejo de error para que el botón
      // "Guardando…" SIEMPRE termine (nunca se cuelga); si falla, avisamos y
      // dejamos reintentar en vez de quedarnos colgados.
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      startTransition(async () => {
        let result: { ok: boolean; error?: string };
        try {
          result = await Promise.race([
            bulkSave(),
            new Promise<{ ok: boolean; error?: string }>((resolve) =>
              setTimeout(() => resolve({ ok: false, error: "timeout" }), 15000),
            ),
          ]);
        } catch {
          result = { ok: false, error: "error" };
        }
        if (result.ok) {
          router.push("/predicciones");
        } else {
          toast.error(t("saveErrorTitle"), { description: t("saveErrorDesc") });
        }
      });
      return;
    }

    // Avance INMEDIATO (client-side); el autosave masivo va por detrás.
    scheduleAutosave();
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
        {/* Aviso de que el marcador a predecir es a 120′ (fin de la prórroga),
            no a penaltis. Solo en rondas eliminatorias. */}
        {isKnockout ? (
          <p className="mx-auto max-w-md rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-3 py-2 text-center font-editorial text-xs italic text-[var(--color-muted-foreground)]">
            {t("ko120Note")}
          </p>
        ) : null}
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
                    timeZone,
                    locale,
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
              <div className="mt-3 flex items-center justify-center gap-3 text-2xl sm:text-3xl">
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
                    timeZone,
                    locale,
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
                  onChange={(v) =>
                    updateCurrent({
                      homeScore: v,
                      willGoToPens: isKnockout && v === currentPred.awayScore,
                      winnerTeamId:
                        isKnockout && v === currentPred.awayScore ? currentPred.winnerTeamId : null,
                    })
                  }
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
                  onChange={(v) =>
                    updateCurrent({
                      awayScore: v,
                      willGoToPens: isKnockout && currentPred.homeScore === v,
                      winnerTeamId:
                        isKnockout && currentPred.homeScore === v ? currentPred.winnerTeamId : null,
                    })
                  }
                  ariaLabel={t("goalsAria", { team: current.away?.name ?? t("awayFallback") })}
                />
              </div>
            </section>

            {/* Empate en KO → quién pasa en penaltis. Aparece automáticamente al
                empatar el marcador (un KO no acaba en tablas). */}
            {isKnockout && currentPred.homeScore === currentPred.awayScore ? (
              <div className="mx-auto w-full max-w-xs">
                <PensWinnerPicker
                  home={current.home}
                  away={current.away}
                  winnerTeamId={currentPred.winnerTeamId}
                  flagSize={20}
                  onPick={(teamId) => updateCurrent({ willGoToPens: true, winnerTeamId: teamId })}
                />
              </div>
            ) : null}

            {/* Goleador (solo completo) */}
            {showScorer ? (
              <section className="space-y-3 border-t border-[var(--color-border)] pt-5">
                <div className="text-center">
                  <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] sm:text-[0.8rem]">
                    {t("scorerLabel")}
                  </p>
                  <p className="mt-1 font-editorial text-sm italic leading-snug text-[var(--color-muted-foreground)] sm:text-base">
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
