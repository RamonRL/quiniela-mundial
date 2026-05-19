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
import { usePredictionSaveToast } from "@/lib/predictions/use-save-toast";
import { formatDateTime } from "@/lib/utils";
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

type Prediction = {
  matchId: number;
  homeScore: number;
  awayScore: number;
  willGoToPens: boolean;
  winnerTeamId: number | null;
  scorerPlayerId: number | null;
};

export function MatchdayPredictionForm({
  matchdayId,
  matches,
  open,
}: {
  matchdayId: number;
  matches: MatchInput[];
  open: boolean;
}) {
  const [predictions, setPredictions] = useState<Prediction[]>(
    matches.map((m) => ({
      matchId: m.id,
      homeScore: m.existing?.homeScore ?? 0,
      awayScore: m.existing?.awayScore ?? 0,
      willGoToPens: m.existing?.willGoToPens ?? false,
      winnerTeamId: m.existing?.winnerTeamId ?? null,
      scorerPlayerId: m.existingScorerPlayerId,
    })),
  );
  const [state, action, pending] = useActionState(saveMatchdayPredictions, initial);

  usePredictionSaveToast(state, {
    successTitle: "Jornada guardada",
    successDescription: "Marcadores y goleadores anotados para esta jornada.",
  });

  function update(matchId: number, patch: Partial<Prediction>) {
    setPredictions((prev) =>
      prev.map((p) => (p.matchId === matchId ? { ...p, ...patch } : p)),
    );
  }

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
          La predicción está cerrada. Sólo puedes consultar lo que enviaste.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {matches.map((m) => {
          const p = predictions.find((x) => x.matchId === m.id)!;
          const isKnockout = m.stage !== "group";
          const hasPlayers = m.homePlayers.length > 0 || m.awayPlayers.length > 0;
          return (
            <Card key={m.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4">
                <Badge variant="outline" className="text-[0.65rem] uppercase">
                  {m.stage}
                </Badge>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {formatDateTime(m.scheduledAt, {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </CardHeader>
              <CardContent className="space-y-2.5 p-4 pt-0">
                <div className="flex items-center justify-between gap-3">
                  <TeamSide team={m.home} />
                  <ScoreStepper
                    value={p.homeScore}
                    onChange={(v) => update(m.id, { homeScore: v })}
                    disabled={!open}
                    ariaLabel={`Goles ${m.home?.name ?? "local"}`}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <TeamSide team={m.away} />
                  <ScoreStepper
                    value={p.awayScore}
                    onChange={(v) => update(m.id, { awayScore: v })}
                    disabled={!open}
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
                        disabled={!open}
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
                        disabled={!open}
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
                      disabled={!open}
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {open ? (
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
