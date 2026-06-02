"use client";

import { TeamFlag } from "@/components/brand/team-flag";
import { ScoreStepper } from "@/components/forms/score-stepper";
import { useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SavePredictionButton } from "@/components/predictions/save-prediction-button";
import { SaveOverlay } from "@/components/predictions/save-overlay";
import { WinnerPicker } from "@/components/predictions/winner-picker";
import { usePredictionSaveToast } from "@/lib/predictions/use-save-toast";
import { formatDateTime } from "@/lib/utils";
import type { PredictionMode } from "@/lib/prediction-modes";
import { saveMatchdayPredictions, type FormState } from "./actions";

const initial: FormState = { ok: false };

const NO_SCORER = "__none__";

type TeamLite = { id: number; name: string; code: string; flagUrl: string | null };
type PlayerLite = {
  id: number;
  name: string;
  jerseyNumber: number | null;
  position: string | null;
};

type MatchInput = {
  id: number;
  stage: "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
  /** Código del grupo (A/B/C…) — solo para `stage === "group"`. */
  groupCode: string | null;
  scheduledAt: string;
  venue: string | null;
  home: TeamLite | null;
  away: TeamLite | null;
  homePlayers: PlayerLite[];
  awayPlayers: PlayerLite[];
  existing: {
    homeScore: number;
    awayScore: number;
    willGoToPens: boolean;
    winnerTeamId: number | null;
  } | null;
  existingScorerPlayerId: number | null;
};

const KNOCKOUT_LABEL: Record<MatchInput["stage"], string> = {
  group: "Grupo",
  r32: "16avos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semis",
  third: "3er puesto",
  final: "Final",
};

/** Texto del badge: "Grupo A" en fase de grupos, nombre traducido en KO. */
function stageLabel(m: Pick<MatchInput, "stage" | "groupCode">): string {
  if (m.stage === "group" && m.groupCode) return `Grupo ${m.groupCode}`;
  return KNOCKOUT_LABEL[m.stage];
}

type Prediction = {
  matchId: number;
  homeScore: number;
  awayScore: number;
  willGoToPens: boolean;
  winnerTeamId: number | null;
  scorerPlayerId: number | null;
  /**
   * Solo Ganador: marca si el usuario eligió 1/X/2 en este partido. Sin
   * esto, un empate (codificado 0-0) sería indistinguible del estado inicial
   * sin elegir — y el servidor guardaría empates fantasma. El server lo
   * respeta solo en modo solo_ganador (en completo/marcador siempre guarda).
   */
  picked: boolean;
};

export function MatchdayPredictionForm({
  matchdayId,
  matches,
  open,
  mode = "completo",
}: {
  matchdayId: number;
  matches: MatchInput[];
  /** `false` = la jornada entera está cerrada (todos los partidos arrancaron).
   *  `true` = al menos un partido sigue upcoming. La granularidad real está
   *  por partido — cada uno se cierra a su kickoff. */
  open: boolean;
  /** Modo de la liga: completo (marcador+goleador), marcador (sin goleador),
   *  solo_ganador (solo 1X2 / quién pasa). */
  mode?: PredictionMode;
}) {
  const soloGanador = mode === "solo_ganador";
  const showScorer = mode === "completo";
  const [predictions, setPredictions] = useState<Prediction[]>(
    matches.map((m) => ({
      matchId: m.id,
      homeScore: m.existing?.homeScore ?? 0,
      awayScore: m.existing?.awayScore ?? 0,
      willGoToPens: m.existing?.willGoToPens ?? false,
      winnerTeamId: m.existing?.winnerTeamId ?? null,
      scorerPlayerId: m.existingScorerPlayerId,
      // Ya elegido si venía una predicción guardada.
      picked: m.existing != null,
    })),
  );
  const [state, action, pending] = useActionState(saveMatchdayPredictions, initial);

  usePredictionSaveToast(state, {
    successTitle: "Jornada guardada",
    successDescription: soloGanador
      ? "Ganadores anotados para esta jornada."
      : showScorer
        ? "Marcadores y goleadores anotados para esta jornada."
        : "Marcadores anotados para esta jornada.",
  });

  function update(matchId: number, patch: Partial<Prediction>) {
    setPredictions((prev) =>
      prev.map((p) => (p.matchId === matchId ? { ...p, ...patch } : p)),
    );
  }

  // Cierre por partido: el cliente comprueba con la hora local del navegador
  // (puede divergir ~segundos del server, aceptable). El server vuelve a
  // validar al guardar y descarta predicciones de partidos ya iniciados.
  const now = Date.now();
  const isMatchOver = (m: MatchInput) =>
    new Date(m.scheduledAt).getTime() <= now;
  const someOpen = open && matches.some((m) => !isMatchOver(m));

  return (
    <form action={action} className="space-y-4">
      <input
        type="hidden"
        name="payload"
        value={JSON.stringify({ matchdayId, predictions })}
      />
      {!open ? (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
          <Lock className="size-4" />
          Todos los partidos de la jornada ya empezaron. Sólo puedes consultar lo que enviaste.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {matches.map((m) => {
          const p = predictions.find((x) => x.matchId === m.id)!;
          const isKnockout = m.stage !== "group";
          const hasPlayers = m.homePlayers.length > 0 || m.awayPlayers.length > 0;
          const matchClosed = isMatchOver(m);
          // Cada input se deshabilita si la jornada entera no está abierta
          // o si el kickoff del partido ya pasó. El segundo caso es el que
          // permite reengancharse: la jornada sigue editable para los
          // partidos posteriores aunque uno temprano ya haya arrancado.
          const inputsDisabled = !open || matchClosed;
          return (
            <Card
              key={m.id}
              className={matchClosed && open ? "opacity-60" : undefined}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4">
                <Badge variant="outline" className="text-[0.65rem] uppercase">
                  {stageLabel(m)}
                </Badge>
                <div className="flex items-center gap-2">
                  {matchClosed && open ? (
                    <Badge variant="outline" className="gap-1 text-[0.55rem] uppercase">
                      <Lock className="size-3" />
                      Cerrado
                    </Badge>
                  ) : null}
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {formatDateTime(m.scheduledAt, {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 p-4 pt-0">
                {soloGanador ? (
                  <WinnerPicker
                    home={m.home}
                    away={m.away}
                    value={p}
                    isKnockout={isKnockout}
                    disabled={inputsDisabled}
                    variant="card"
                    onChange={(patch) => update(m.id, patch)}
                  />
                ) : (
                <>
                <div className="flex items-center justify-between gap-3">
                  <TeamSide team={m.home} />
                  <ScoreStepper
                    value={p.homeScore}
                    onChange={(v) => update(m.id, { homeScore: v })}
                    disabled={inputsDisabled}
                    ariaLabel={`Goles ${m.home?.name ?? "local"}`}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <TeamSide team={m.away} />
                  <ScoreStepper
                    value={p.awayScore}
                    onChange={(v) => update(m.id, { awayScore: v })}
                    disabled={inputsDisabled}
                    ariaLabel={`Goles ${m.away?.name ?? "visitante"}`}
                  />
                </div>
                {isKnockout ? (
                  <div className="space-y-2 rounded-md bg-[var(--color-surface-2)] p-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Checkbox
                        id={`pens-${m.id}`}
                        checked={p.willGoToPens}
                        onCheckedChange={(v) =>
                          update(m.id, { willGoToPens: v === true })
                        }
                        disabled={inputsDisabled}
                      />
                      <Label htmlFor={`pens-${m.id}`}>Predigo penaltis (+2)</Label>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Clasificado a la siguiente ronda</Label>
                      <Select
                        value={p.winnerTeamId?.toString() ?? ""}
                        onValueChange={(v) =>
                          update(m.id, { winnerTeamId: v === "" ? null : Number(v) })
                        }
                        disabled={inputsDisabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {m.home ? (
                            <SelectItem value={m.home.id.toString()}>
                              {m.home.name}
                            </SelectItem>
                          ) : null}
                          {m.away ? (
                            <SelectItem value={m.away.id.toString()}>
                              {m.away.name}
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : null}

                {showScorer ? (
                <div className="space-y-1.5 border-t border-dashed border-[var(--color-border)] pt-3">
                  <Label className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Goleador del partido <span className="text-[var(--color-arena)]">+4 / +6</span>
                  </Label>
                  {hasPlayers ? (
                    <Select
                      value={p.scorerPlayerId?.toString() ?? NO_SCORER}
                      onValueChange={(v) =>
                        update(m.id, {
                          scorerPlayerId: v === NO_SCORER ? null : Number(v),
                        })
                      }
                      disabled={inputsDisabled}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Sin pick" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_SCORER}>
                          <span className="text-[var(--color-muted-foreground)]">
                            Sin pick
                          </span>
                        </SelectItem>
                        {m.home && m.homePlayers.length > 0 ? (
                          <SelectGroup>
                            <SelectLabel className="font-mono text-[0.6rem] uppercase tracking-[0.18em]">
                              {m.home.code}
                            </SelectLabel>
                            {m.homePlayers.map((pl) => (
                              <SelectItem key={pl.id} value={pl.id.toString()}>
                                {playerLabel(pl)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ) : null}
                        {m.away && m.awayPlayers.length > 0 ? (
                          <SelectGroup>
                            <SelectLabel className="font-mono text-[0.6rem] uppercase tracking-[0.18em]">
                              {m.away.code}
                            </SelectLabel>
                            {m.awayPlayers.map((pl) => (
                              <SelectItem key={pl.id} value={pl.id.toString()}>
                                {playerLabel(pl)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ) : null}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                      Plantillas pendientes de carga.
                    </p>
                  )}
                </div>
                ) : null}
                </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {someOpen ? (
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-10 flex justify-center rounded-xl border border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-surface)_92%,transparent)] p-2 backdrop-blur-md sm:bottom-3">
          <SavePredictionButton pending={pending} />
        </div>
      ) : null}

      <SaveOverlay open={pending} />
    </form>
  );
}

function playerLabel(p: PlayerLite): string {
  const num = p.jerseyNumber != null ? `#${p.jerseyNumber} ` : "";
  const pos = p.position ? ` · ${p.position}` : "";
  return `${num}${p.name}${pos}`;
}

function TeamSide({ team }: { team: TeamLite | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <TeamFlag code={team?.code} size={28} />
      <span className="truncate text-sm font-medium">{team?.name ?? "—"}</span>
    </div>
  );
}

