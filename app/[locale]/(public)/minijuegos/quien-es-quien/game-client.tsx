"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Clock3, Loader2, Play, Trophy, Users2, X, Zap } from "lucide-react";
import { TeamFlag } from "@/components/brand/team-flag";
import { cn } from "@/lib/utils";
import {
  NicknameGate,
  getStoredGuestNickname,
} from "../_components/nickname-gate";
import { GameStage } from "../_components/game-stage";
import { startRound, submitScore, type Round, type RoundOption } from "./actions";

const GAME_SECONDS = 60;
const REVEAL_MS = 450;

type Props = {
  myIdentityKey: string | null;
  myBestScore: number | null;
};

type RevealState = { chosenPlayerId: number; isCorrect: boolean };

type Phase =
  | { kind: "idle" }
  | { kind: "starting" }
  | {
      kind: "playing";
      rounds: Round[];
      token: string;
      index: number;
      choices: ChosenAnswer[];
      correctCount: number;
      reveal: RevealState | null;
    }
  | { kind: "submitting"; rounds: Round[]; token: string; choices: ChosenAnswer[] }
  | {
      kind: "done";
      score: number;
      previousBest: number | null;
      improved: boolean;
      rank: number;
      totalParticipants: number;
    }
  | { kind: "error"; message: string };

type ChosenAnswer = { roundId: number; chosenPlayerId: number };

export function QuienEsQuienClient({ myIdentityKey, myBestScore }: Props) {
  const isGuest = myIdentityKey == null;
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);
  const [showGate, setShowGate] = useState(false);
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const revealTimerRef = useRef<number | null>(null);

  // El stage debe estar activo durante toda la partida (starting → done).
  // En idle/error volvemos a la página normal con su intro panel.
  const stageActive =
    phase.kind === "starting" ||
    phase.kind === "playing" ||
    phase.kind === "submitting" ||
    phase.kind === "done";

  // ─────────────────────── timers ───────────────────────
  useEffect(() => {
    if (phase.kind !== "playing") return;
    const startedAt = Date.now();
    setSecondsLeft(GAME_SECONDS);
    const id = window.setInterval(() => {
      const left = Math.max(0, GAME_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        const current = phaseRef.current;
        if (current.kind === "playing") {
          finishGame(current);
        }
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind === "playing" ? (phase as { token: string }).token : null]);

  useEffect(
    () => () => {
      if (revealTimerRef.current != null) window.clearTimeout(revealTimerRef.current);
    },
    [],
  );

  // ─────────────────────── start / advance / submit ───────────────────────
  const beginGame = useCallback(async () => {
    setPhase({ kind: "starting" });
    try {
      const res = await startRound();
      if (!res.ok) {
        setPhase({ kind: "error", message: res.error });
        return;
      }
      preloadPhotos(res.rounds.slice(0, 8));
      setPhase({
        kind: "playing",
        rounds: res.rounds,
        token: res.token,
        index: 0,
        choices: [],
        correctCount: 0,
        reveal: null,
      });
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "No se pudo iniciar la partida.",
      });
    }
  }, []);

  const handlePlayClick = () => {
    if (isGuest && !getStoredGuestNickname()) {
      setShowGate(true);
      return;
    }
    void beginGame();
  };

  const handleGateConfirm = () => {
    setShowGate(false);
    void beginGame();
  };

  const advance = useCallback(() => {
    setPhase((current) => {
      if (current.kind !== "playing") return current;
      const nextIndex = current.index + 1;
      if (nextIndex >= current.rounds.length) {
        finishGame(current);
        return current;
      }
      preloadPhotos(current.rounds.slice(nextIndex, nextIndex + 2));
      return { ...current, index: nextIndex, reveal: null };
    });
  }, []);

  const handleChoose = (option: RoundOption) => {
    setPhase((current) => {
      if (current.kind !== "playing") return current;
      if (current.reveal) return current;
      const round = current.rounds[current.index];
      if (!round) return current;
      const isCorrect = option.playerId === round.correctPlayerId;
      const newChoices = [
        ...current.choices,
        { roundId: round.roundId, chosenPlayerId: option.playerId },
      ];

      if (revealTimerRef.current != null) window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = window.setTimeout(advance, REVEAL_MS);

      return {
        ...current,
        choices: newChoices,
        correctCount: current.correctCount + (isCorrect ? 1 : 0),
        reveal: { chosenPlayerId: option.playerId, isCorrect },
      };
    });
  };

  const finishGame = useCallback(
    async (state: Extract<Phase, { kind: "playing" }>) => {
      if (revealTimerRef.current != null) window.clearTimeout(revealTimerRef.current);
      setPhase({
        kind: "submitting",
        rounds: state.rounds,
        token: state.token,
        choices: state.choices,
      });
      try {
        const res = await submitScore({
          token: state.token,
          answers: state.choices,
          nickname: isGuest ? getStoredGuestNickname() ?? undefined : undefined,
        });
        if (!res.ok) {
          setPhase({ kind: "error", message: res.error });
          return;
        }
        setPhase({
          kind: "done",
          score: res.score,
          previousBest: res.previousBest,
          improved: res.improved,
          rank: res.rank,
          totalParticipants: res.totalParticipants,
        });
      } catch (err) {
        setPhase({
          kind: "error",
          message: err instanceof Error ? err.message : "No se pudo enviar tu puntuación.",
        });
      }
    },
    [isGuest],
  );

  const handleAbandon = useCallback(() => {
    if (revealTimerRef.current != null) window.clearTimeout(revealTimerRef.current);
    setPhase({ kind: "idle" });
  }, []);

  const handleCloseDone = useCallback(() => {
    setPhase({ kind: "idle" });
  }, []);

  // ─────────────────────── render ───────────────────────

  return (
    <>
      {/* Intro / error en página normal (con la estética del sitio). */}
      {phase.kind === "idle" || phase.kind === "error" ? (
        <IntroPanel
          myBestScore={myBestScore}
          onPlay={handlePlayClick}
          errorMessage={phase.kind === "error" ? phase.message : null}
        />
      ) : null}

      {/* Gate del apodo — modal sobre la intro. */}
      <NicknameGate
        enabled={isGuest}
        open={showGate}
        onConfirm={handleGateConfirm}
        onCancel={() => setShowGate(false)}
      />

      {/* Stage arcade — fullscreen durante la partida. */}
      <GameStage
        active={stageActive}
        abandonConfirm={
          phase.kind === "playing"
            ? "¿Abandonar la partida? Perderás los aciertos de esta ronda."
            : undefined
        }
        onAbandon={phase.kind === "playing" ? handleAbandon : undefined}
        onClose={handleCloseDone}
        exitLabel={phase.kind === "done" ? "Cerrar" : undefined}
      >
        {phase.kind === "starting" ? <StagePending label="Preparando partida" /> : null}
        {phase.kind === "submitting" ? (
          <StagePending label="Calculando puntuación" />
        ) : null}
        {phase.kind === "playing" ? (
          <PlayPanel
            round={phase.rounds[phase.index]!}
            roundNumber={phase.index + 1}
            totalRounds={phase.rounds.length}
            correctCount={phase.correctCount}
            secondsLeft={secondsLeft}
            reveal={phase.reveal}
            onChoose={handleChoose}
          />
        ) : null}
        {phase.kind === "done" ? (
          <ResultPanel
            score={phase.score}
            previousBest={phase.previousBest}
            improved={phase.improved}
            rank={phase.rank}
            totalParticipants={phase.totalParticipants}
            onPlayAgain={() => void beginGame()}
            onClose={handleCloseDone}
          />
        ) : null}
      </GameStage>
    </>
  );
}

// ───────────────────────────────────────────────────────────────
// Intro panel (página normal) — sigue el lenguaje del sitio pero
// con un punto arcade (verde césped + label "INSERT COIN").
// ───────────────────────────────────────────────────────────────
function IntroPanel({
  myBestScore,
  onPlay,
  errorMessage,
}: {
  myBestScore: number | null;
  onPlay: () => void;
  errorMessage: string | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center sm:p-12">
      {/* Línea verde tipo gradiente de campo */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-pitch)] to-transparent opacity-60"
      />
      <span
        aria-hidden
        className="halftone pointer-events-none absolute inset-0 opacity-[0.04]"
      />

      <div className="relative space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-pitch)]/40 bg-[color-mix(in_oklch,var(--color-pitch)_8%,transparent)] px-3 py-1">
          <span className="size-1.5 rounded-full bg-[var(--color-pitch)] mj-led-blink" />
          <span className="font-mono text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-pitch)]">
            Insert coin · 60 s
          </span>
        </div>
        <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
          ¿Listo para jugar?
        </h2>
        <p className="mx-auto max-w-md font-editorial text-base italic text-[var(--color-muted-foreground)]">
          Aparecerán caras de jugadores. Elige el nombre correcto entre cuatro
          opciones. Verás al instante si has acertado.
        </p>
        {myBestScore != null ? (
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Tu mejor:{" "}
            <span className="font-display text-2xl tabular text-[var(--color-pitch)] glow-pitch">
              {myBestScore}
            </span>
          </p>
        ) : null}
        <button
          type="button"
          onClick={onPlay}
          className="group inline-flex items-center gap-2 rounded-md border-2 border-[var(--color-pitch)] bg-[var(--color-pitch)] px-6 py-3 font-mono text-[0.7rem] font-bold uppercase tracking-[0.24em] text-black shadow-[var(--shadow-pitch)] transition hover:-translate-y-0.5"
        >
          <Play className="size-4" />
          Empezar partida
        </button>
        {errorMessage ? (
          <p className="mx-auto max-w-sm rounded-md border border-[var(--color-danger)]/40 bg-[color-mix(in_oklch,var(--color-danger)_8%,transparent)] px-3 py-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-danger)]">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Stage placeholder — starting / submitting
// ───────────────────────────────────────────────────────────────
function StagePending({ label }: { label: string }) {
  return (
    <div className="m-auto flex flex-col items-center gap-4 text-center">
      <Loader2 className="size-10 text-[var(--mj-pitch)] mj-spinner" />
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.36em] text-[var(--mj-text-dim)]">
        {label}…
      </p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Play panel — HUD scoreboard + foto + opciones
// ───────────────────────────────────────────────────────────────
function PlayPanel({
  round,
  roundNumber,
  totalRounds,
  correctCount,
  secondsLeft,
  reveal,
  onChoose,
}: {
  round: Round;
  roundNumber: number;
  totalRounds: number;
  correctCount: number;
  secondsLeft: number;
  reveal: RevealState | null;
  onChoose: (option: RoundOption) => void;
}) {
  const progressPct = Math.max(0, Math.min(100, (secondsLeft / GAME_SECONDS) * 100));
  const lowTime = secondsLeft <= 10;
  const timerColor = lowTime ? "var(--mj-red)" : secondsLeft <= 20 ? "var(--mj-amber)" : "var(--mj-pitch)";

  return (
    <div className="space-y-6">
      {/* Scoreboard HUD */}
      <div
        className={cn(
          "relative grid grid-cols-3 items-center gap-2 rounded-lg border bg-[var(--mj-bg-2)]/85 p-4 backdrop-blur-sm sm:p-5",
          reveal == null
            ? "border-[var(--mj-line)]"
            : reveal.isCorrect
              ? "border-[var(--mj-pitch)]/50"
              : "border-[var(--mj-red)]/50",
        )}
      >
        {/* Pista de "REC" parpadeante */}
        <span className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[var(--mj-red)] mj-led-blink" />
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.32em] text-[var(--mj-text-dim)]">
            Live
          </span>
        </span>

        {/* Timer */}
        <div className="flex flex-col items-center">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--mj-text-dim)]">
            Tiempo
          </span>
          <span className="flex items-baseline gap-1">
            <Clock3
              className={cn("size-4 self-center", lowTime ? "animate-pulse" : "")}
              style={{ color: timerColor }}
            />
            <span
              className={cn(
                "font-display text-5xl tabular leading-none sm:text-6xl",
                lowTime ? "mj-glow-red" : secondsLeft <= 20 ? "mj-glow-amber" : "mj-glow-pitch",
              )}
              style={{ color: timerColor }}
            >
              {secondsLeft.toString().padStart(2, "0")}
            </span>
          </span>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center border-x border-[var(--mj-line)]">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--mj-text-dim)]">
            Aciertos
          </span>
          <span className="font-display text-5xl tabular leading-none text-[var(--mj-pitch)] mj-glow-pitch sm:text-6xl">
            {correctCount.toString().padStart(2, "0")}
          </span>
        </div>

        {/* Round */}
        <div className="flex flex-col items-center">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--mj-text-dim)]">
            Ronda
          </span>
          <span className="font-display text-3xl tabular leading-none text-[var(--mj-text)] sm:text-4xl">
            <span>{roundNumber.toString().padStart(2, "0")}</span>
            <span className="text-[var(--mj-text-dim)] text-2xl">/{totalRounds.toString().padStart(2, "0")}</span>
          </span>
        </div>
      </div>

      {/* Barra de progreso del timer */}
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--mj-bg-2)]">
        <div
          className="h-full transition-[width] duration-200 ease-linear"
          style={{
            width: `${progressPct}%`,
            backgroundColor: timerColor,
            boxShadow: `0 0 12px ${timerColor}`,
          }}
        />
      </div>

      {/* Foto del jugador con frame "CRT" */}
      <div
        key={round.roundId}
        className={cn(
          "relative mx-auto aspect-square w-full max-w-[20.4rem] overflow-hidden rounded-xl border-2 bg-[var(--mj-bg-3)] transition-colors mj-slam-in",
          reveal == null
            ? "border-[var(--mj-line-strong)]"
            : reveal.isCorrect
              ? "border-[var(--mj-pitch)] mj-correct-pulse"
              : "border-[var(--mj-red)] mj-wrong-shake",
        )}
      >
        {/* Esquinas decorativas tipo "viewfinder" */}
        {([
          "left-2 top-2 border-l-2 border-t-2",
          "right-2 top-2 border-r-2 border-t-2",
          "left-2 bottom-2 border-l-2 border-b-2",
          "right-2 bottom-2 border-r-2 border-b-2",
        ] as const).map((c, i) => (
          <span
            key={i}
            aria-hidden
            className={cn(
              "pointer-events-none absolute size-4",
              c,
              reveal == null
                ? "border-[var(--mj-pitch)]/50"
                : reveal.isCorrect
                  ? "border-[var(--mj-pitch)]"
                  : "border-[var(--mj-red)]",
            )}
          />
        ))}
        <Image
          src={round.photoUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 90vw, 24rem"
          className="object-cover"
          priority={roundNumber <= 2}
          unoptimized
        />
        {reveal != null ? (
          <span
            aria-hidden
            className={cn(
              "absolute right-3 top-3 z-10 grid size-12 place-items-center rounded-full shadow-xl",
              reveal.isCorrect ? "bg-[var(--mj-pitch)]" : "bg-[var(--mj-red)]",
            )}
            style={{
              boxShadow: `0 0 24px ${reveal.isCorrect ? "var(--mj-pitch)" : "var(--mj-red)"}`,
            }}
          >
            {reveal.isCorrect ? (
              <Check className="size-6 text-black" strokeWidth={3} />
            ) : (
              <X className="size-6 text-white" strokeWidth={3} />
            )}
          </span>
        ) : null}
      </div>

      {/* Opciones */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
        {round.options.map((opt) => {
          const isChosen = reveal?.chosenPlayerId === opt.playerId;
          const isCorrect = opt.playerId === round.correctPlayerId;
          let stateClass = "";
          if (reveal != null) {
            if (isChosen) {
              stateClass = reveal.isCorrect
                ? "border-[var(--mj-pitch)] bg-[color-mix(in_oklch,var(--mj-pitch)_18%,var(--mj-bg-2))] text-[var(--mj-pitch)]"
                : "border-[var(--mj-red)] bg-[color-mix(in_oklch,var(--mj-red)_18%,var(--mj-bg-2))] text-[var(--mj-red)]";
            } else if (isCorrect && !reveal.isCorrect) {
              stateClass =
                "border-[var(--mj-pitch)]/70 bg-[color-mix(in_oklch,var(--mj-pitch)_10%,var(--mj-bg-2))] text-[var(--mj-pitch)]";
            } else {
              stateClass = "opacity-40";
            }
          }
          return (
            <button
              key={opt.playerId}
              type="button"
              disabled={reveal != null}
              onClick={() => onChoose(opt)}
              className={cn(
                "group flex items-center gap-3 rounded-lg border-2 px-4 py-4 text-left font-mono uppercase tracking-[0.04em] transition disabled:cursor-default",
                reveal == null
                  ? "border-[var(--mj-line)] bg-[var(--mj-bg-2)]/70 text-[var(--mj-text)] hover:-translate-y-0.5 hover:border-[var(--mj-pitch)] hover:bg-[var(--mj-bg-3)] hover:text-[var(--mj-pitch)]"
                  : "bg-[var(--mj-bg-2)]/70",
                stateClass,
              )}
            >
              <TeamFlag code={opt.teamCode} size={28} bare />
              <span className="truncate text-[0.95rem] font-semibold normal-case tracking-tight">
                {opt.name}
              </span>
              {reveal != null && isChosen ? (
                reveal.isCorrect ? (
                  <Check className="ml-auto size-4 shrink-0" />
                ) : (
                  <X className="ml-auto size-4 shrink-0" />
                )
              ) : reveal != null && isCorrect ? (
                <Check className="ml-auto size-4 shrink-0" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Result panel — pantalla final dentro del stage
// ───────────────────────────────────────────────────────────────
function ResultPanel({
  score,
  previousBest,
  improved,
  rank,
  totalParticipants,
  onPlayAgain,
  onClose,
}: {
  score: number;
  previousBest: number | null;
  improved: boolean;
  rank: number;
  totalParticipants: number;
  onPlayAgain: () => void;
  onClose: () => void;
}) {
  return (
    <div className="m-auto w-full max-w-md space-y-6 rounded-2xl border-2 border-[var(--mj-pitch)]/60 bg-[var(--mj-bg-2)]/90 p-8 text-center backdrop-blur-sm mj-stage-in">
      <div className="space-y-2">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.36em] text-[var(--mj-text-dim)]">
          {improved ? "Récord nuevo" : "Final · Partida"}
        </p>
        <p
          className="font-display text-[7rem] tabular leading-none text-[var(--mj-pitch)] mj-glow-pitch sm:text-[8rem]"
          style={{ letterSpacing: "-0.04em" }}
        >
          {score.toString().padStart(2, "0")}
        </p>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[var(--mj-text-dim)]">
          {improved
            ? previousBest != null
              ? `superas tu mejor de ${previousBest}`
              : "tu primer registro"
            : `tu mejor sigue siendo ${previousBest ?? score}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatChip icon={<Trophy className="size-4" />} label="Posición" value={`#${rank}`} />
        <StatChip
          icon={<Users2 className="size-4" />}
          label="Jugadores"
          value={totalParticipants}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onPlayAgain}
          className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-[var(--mj-pitch)] bg-[var(--mj-pitch)] px-5 py-3 font-mono text-[0.7rem] font-bold uppercase tracking-[0.24em] text-black transition hover:-translate-y-0.5"
        >
          <Zap className="size-4" />
          Otra partida
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-[var(--mj-line-strong)] bg-transparent px-5 py-3 font-mono text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[var(--mj-text)] transition hover:border-[var(--mj-pitch)] hover:text-[var(--mj-pitch)]"
        >
          Ver ranking
        </button>
      </div>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-[var(--mj-line)] bg-[var(--mj-bg-3)] p-3 text-left">
      <div className="flex items-center gap-1.5 text-[var(--mj-pitch)]">
        {icon}
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em]">{label}</p>
      </div>
      <p className="mt-1 font-display text-3xl tabular text-[var(--mj-text)]">{value}</p>
    </div>
  );
}

function preloadPhotos(rounds: Round[]) {
  if (typeof window === "undefined") return;
  for (const r of rounds) {
    const img = new window.Image();
    img.src = r.photoUrl;
  }
}
