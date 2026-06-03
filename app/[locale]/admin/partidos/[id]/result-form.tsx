"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScoreStepper } from "@/components/forms/score-stepper";
import { saveMatchResult, type FormState } from "./actions";

const initial: FormState = { ok: false };

type TeamLite = { id: number; name: string; code: string };
type PlayerLite = { id: number; name: string; teamId: number; jerseyNumber: number | null };

type ScorerRow = {
  playerId: number | null;
  teamId: number | null;
  minute: number | null;
  isOwnGoal: boolean;
  isPenalty: boolean;
};

type Props = {
  match: {
    id: number;
    stage: "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
    homeTeamId: number | null;
    awayTeamId: number | null;
    homeScore: number | null;
    awayScore: number | null;
    status: "scheduled" | "live" | "finished";
    wentToPens: boolean;
    homeScorePen: number | null;
    awayScorePen: number | null;
    winnerTeamId: number | null;
  };
  homeTeam: TeamLite | null;
  awayTeam: TeamLite | null;
  players: PlayerLite[];
  existingScorers: {
    playerId: number;
    teamId: number;
    minute: number | null;
    isOwnGoal: boolean;
    isPenalty: boolean;
  }[];
};

export function ResultForm({ match, homeTeam, awayTeam, players, existingScorers }: Props) {
  const [state, action, pending] = useActionState(saveMatchResult, initial);
  const [home, setHome] = useState<number>(match.homeScore ?? 0);
  const [away, setAway] = useState<number>(match.awayScore ?? 0);
  const [status, setStatus] = useState<typeof match.status>(match.status);
  const [pens, setPens] = useState<boolean>(match.wentToPens);
  const [homePen, setHomePen] = useState<number>(match.homeScorePen ?? 0);
  const [awayPen, setAwayPen] = useState<number>(match.awayScorePen ?? 0);
  const [winnerTeamId, setWinnerTeamId] = useState<string>(
    match.winnerTeamId?.toString() ?? "",
  );
  const [scorers, setScorers] = useState<ScorerRow[]>(
    existingScorers.length > 0
      ? existingScorers.map((s) => ({
          playerId: s.playerId,
          teamId: s.teamId,
          minute: s.minute,
          isOwnGoal: s.isOwnGoal,
          isPenalty: s.isPenalty,
        }))
      : [],
  );

  const isKnockout = match.stage !== "group";
  const playersByTeam = useMemo(() => {
    const map = new Map<number, PlayerLite[]>();
    for (const p of players) {
      const arr = map.get(p.teamId) ?? [];
      arr.push(p);
      map.set(p.teamId, arr);
    }
    return map;
  }, [players]);

  function addScorer(teamId: number) {
    setScorers((prev) => [
      ...prev,
      { playerId: null, teamId, minute: null, isOwnGoal: false, isPenalty: false },
    ]);
  }
  function removeScorer(idx: number) {
    setScorers((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateScorer(idx: number, patch: Partial<ScorerRow>) {
    setScorers((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  return (
    <form
      action={action}
      className="space-y-6"
    >
      <input type="hidden" name="matchId" value={match.id} />
      <input
        type="hidden"
        name="scorersJson"
        value={JSON.stringify(scorers.filter((s) => s.playerId != null))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Marcador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <Badge variant="outline">{homeTeam?.code ?? "—"}</Badge>
              <p className="font-medium">{homeTeam?.name ?? "Local"}</p>
              <ScoreStepper
                value={home}
                onChange={setHome}
                ariaLabel={`Goles ${homeTeam?.name ?? "local"}`}
              />
              <input type="hidden" name="homeScore" value={home} />
            </div>
            <span className="font-display text-3xl text-[var(--color-muted-foreground)]">vs</span>
            <div className="flex flex-col items-center gap-2 text-center">
              <Badge variant="outline">{awayTeam?.code ?? "—"}</Badge>
              <p className="font-medium">{awayTeam?.name ?? "Visitante"}</p>
              <ScoreStepper
                value={away}
                onChange={setAway}
                ariaLabel={`Goles ${awayTeam?.name ?? "visitante"}`}
              />
              <input type="hidden" name="awayScore" value={away} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <Select
                name="status"
                value={status}
                onValueChange={(v) => setStatus(v as typeof status)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Programado</SelectItem>
                  <SelectItem value="live">En juego</SelectItem>
                  <SelectItem value="finished">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isKnockout ? (
              <>
                <div className="flex items-end gap-2">
                  <div className="flex h-10 items-center gap-2">
                    <Checkbox
                      id="wentToPens"
                      name="wentToPens"
                      checked={pens}
                      onCheckedChange={(v) => setPens(v === true)}
                    />
                    <Label htmlFor="wentToPens">Decidido por penaltis</Label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="winnerTeamId">Clasificado</Label>
                  <Select
                    name="winnerTeamId"
                    value={winnerTeamId}
                    onValueChange={setWinnerTeamId}
                  >
                    <SelectTrigger id="winnerTeamId">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {homeTeam ? (
                        <SelectItem value={homeTeam.id.toString()}>{homeTeam.name}</SelectItem>
                      ) : null}
                      {awayTeam ? (
                        <SelectItem value={awayTeam.id.toString()}>{awayTeam.name}</SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}
          </div>
          {isKnockout && pens ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Penaltis {homeTeam?.code ?? "local"}</Label>
                <ScoreStepper
                  value={homePen}
                  onChange={setHomePen}
                  ariaLabel={`Penaltis ${homeTeam?.name ?? "local"}`}
                />
                <input type="hidden" name="homeScorePen" value={homePen} />
              </div>
              <div className="space-y-1.5">
                <Label>Penaltis {awayTeam?.code ?? "visitante"}</Label>
                <ScoreStepper
                  value={awayPen}
                  onChange={setAwayPen}
                  ariaLabel={`Penaltis ${awayTeam?.name ?? "visitante"}`}
                />
                <input type="hidden" name="awayScorePen" value={awayPen} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Goleadores</CardTitle>
          <div className="flex gap-2">
            {homeTeam ? (
              <Button type="button" size="sm" variant="outline" onClick={() => addScorer(homeTeam.id)}>
                <Plus />
                Gol {homeTeam.code}
              </Button>
            ) : null}
            {awayTeam ? (
              <Button type="button" size="sm" variant="outline" onClick={() => addScorer(awayTeam.id)}>
                <Plus />
                Gol {awayTeam.code}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {scorers.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Sin goles registrados todavía. El primer gol se calcula automáticamente como el de
              menor minuto entre los goleadores no marcados como &ldquo;en propia&rdquo;.
            </p>
          ) : null}
          {scorers.map((s, i) => {
            const teamPlayers = s.teamId ? (playersByTeam.get(s.teamId) ?? []) : [];
            const team =
              s.teamId === homeTeam?.id ? homeTeam : s.teamId === awayTeam?.id ? awayTeam : null;
            return (
              <div
                key={i}
                className="grid gap-2 rounded-md border border-[var(--color-border)] p-3 sm:grid-cols-[120px_1fr_100px_auto_auto_auto]"
              >
                <Badge variant="outline" className="self-center">
                  {team?.code ?? "?"}
                </Badge>
                <Select
                  value={s.playerId?.toString() ?? ""}
                  onValueChange={(v) => updateScorer(i, { playerId: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona jugador" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamPlayers.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.jerseyNumber != null ? `${p.jerseyNumber} · ` : ""}
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="min"
                  value={s.minute ?? ""}
                  onChange={(e) =>
                    updateScorer(i, {
                      minute: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
                <label className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={s.isOwnGoal}
                    onCheckedChange={(v) => updateScorer(i, { isOwnGoal: v === true })}
                  />{" "}
                  EP
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={s.isPenalty}
                    onCheckedChange={(v) => updateScorer(i, { isPenalty: v === true })}
                  />{" "}
                  Pen.
                </label>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeScorer(i)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-[var(--color-success)]">
          Resultado guardado. Los puntos se han recalculado.
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          <Save />
          {pending ? "Guardando…" : "Guardar resultado"}
        </Button>
      </div>
    </form>
  );
}
