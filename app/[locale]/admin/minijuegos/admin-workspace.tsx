"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Loader2,
  RotateCcw,
  Trash2,
  Trophy,
  Users2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { cn, formatRelative } from "@/lib/utils";
import { MINIGAMES } from "@/app/[locale]/(public)/minijuegos/_lib/games";
import {
  deleteScore,
  deleteScores,
  resetAllMinigames,
  resetGame,
  type AdminScoreRow,
  type FormState,
  type GameOverview,
} from "./actions";

type Props = {
  overview: GameOverview[];
  topByGame: Record<string, AdminScoreRow[]>;
};

export function MinigamesAdminWorkspace({ overview, topByGame }: Props) {
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, Set<number>>>({});

  const overviewByKey = useMemo(
    () => Object.fromEntries(overview.map((o) => [o.gameKey, o])),
    [overview],
  );

  function run(fn: () => Promise<FormState>, label: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? `${label} ejecutada.`);
      else toast.error(res.error ?? "Error.");
    });
  }

  function toggleSelected(gameKey: string, id: number) {
    setSelected((prev) => {
      const next = new Set(prev[gameKey] ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, [gameKey]: next };
    });
  }

  function clearSelected(gameKey: string) {
    setSelected((prev) => ({ ...prev, [gameKey]: new Set() }));
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 lg:grid-cols-2">
        {MINIGAMES.map((game) => {
          const stats = overviewByKey[game.gameKey];
          const Icon = game.icon;
          const isOpen = expanded === game.gameKey;
          const rows = topByGame[game.gameKey] ?? [];
          const selectedIds = selected[game.gameKey] ?? new Set<number>();
          return (
            <Card
              key={game.gameKey}
              className={cn(
                game.status === "soon"
                  ? "border-dashed border-[var(--color-border)] opacity-80"
                  : "",
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                      <Icon className="size-5 text-[var(--color-arena)]" />
                    </span>
                    <div>
                      <CardTitle className="text-base">{game.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {game.gameKey}
                      </CardDescription>
                    </div>
                  </div>
                  {game.status === "soon" ? (
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                      Próximamente
                    </span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-left">
                  <Stat
                    icon={<Users2 className="size-3.5" />}
                    label="Jugadores"
                    value={stats?.totalParticipants ?? 0}
                    sub={
                      stats && stats.totalGuests > 0
                        ? `${stats.totalGuests} invitados`
                        : undefined
                    }
                  />
                  <Stat
                    icon={<Trophy className="size-3.5" />}
                    label="Mejor"
                    value={stats?.bestScore ?? "—"}
                    sub={stats?.bestDisplayName ?? undefined}
                  />
                  <Stat
                    icon={<Clock className="size-3.5" />}
                    label="Última"
                    value={
                      stats?.lastPlayedAt ? formatRelative(stats.lastPlayedAt) : "—"
                    }
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={game.status === "soon" || (stats?.totalParticipants ?? 0) === 0}
                  onClick={() => setExpanded(isOpen ? null : game.gameKey)}
                >
                  <ChevronDown
                    className={cn("transition", isOpen ? "rotate-180" : "")}
                  />
                  {isOpen ? "Ocultar top" : `Ver top ${rows.length}`}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:border-[var(--color-danger)] hover:bg-[color-mix(in_oklch,var(--color-danger)_8%,transparent)] hover:text-[var(--color-danger)]"
                  disabled={
                    pending ||
                    game.status === "soon" ||
                    (stats?.totalParticipants ?? 0) === 0
                  }
                  onClick={() =>
                    run(
                      () => resetGame(game.gameKey),
                      `Reset ${game.name}`,
                      `Vas a borrar TODAS las puntuaciones de "${game.name}". ¿Continuar?`,
                    )
                  }
                >
                  {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                  Resetear este juego
                </Button>
              </CardFooter>
              {isOpen ? (
                <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-5 py-3">
                  {rows.length === 0 ? (
                    <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                      Sin puntuaciones todavía.
                    </p>
                  ) : (
                    <>
                      {selectedIds.size > 0 ? (
                        <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)] px-3 py-2">
                          <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[var(--color-foreground)]">
                            {selectedIds.size} seleccionada
                            {selectedIds.size > 1 ? "s" : ""}
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => clearSelected(game.gameKey)}
                              disabled={pending}
                            >
                              Limpiar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:border-[var(--color-danger)] hover:bg-[color-mix(in_oklch,var(--color-danger)_8%,transparent)] hover:text-[var(--color-danger)]"
                              disabled={pending}
                              onClick={() =>
                                run(
                                  () => deleteScores(Array.from(selectedIds)),
                                  "Borrado masivo",
                                  `Vas a borrar ${selectedIds.size} puntuaciones. ¿Continuar?`,
                                )
                              }
                            >
                              {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
                              Borrar seleccionadas
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] text-left font-mono text-[0.6rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                            <th className="w-8 pb-2"></th>
                            <th className="w-10 pb-2">#</th>
                            <th className="pb-2">Jugador</th>
                            <th className="pb-2 text-right">Pts</th>
                            <th className="hidden pb-2 text-right sm:table-cell">
                              Última
                            </th>
                            <th className="w-10 pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => {
                            const checked = selectedIds.has(r.id);
                            return (
                              <tr
                                key={r.id}
                                className={cn(
                                  "border-b border-[var(--color-border)]/60 last:border-b-0",
                                  checked
                                    ? "bg-[color-mix(in_oklch,var(--color-arena)_5%,transparent)]"
                                    : "",
                                )}
                              >
                                <td className="py-2">
                                  <input
                                    type="checkbox"
                                    aria-label={`Seleccionar ${r.displayName}`}
                                    checked={checked}
                                    onChange={() => toggleSelected(game.gameKey, r.id)}
                                    className="size-4 cursor-pointer accent-[var(--color-arena)]"
                                  />
                                </td>
                                <td className="py-2 font-display tabular text-[var(--color-muted-foreground)]">
                                  {(i + 1).toString().padStart(2, "0")}
                                </td>
                                <td className="py-2">
                                  <span className="flex items-center gap-2">
                                    <span className="truncate text-sm font-medium">
                                      {r.displayName}
                                    </span>
                                    {r.isGuest ? (
                                      <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                                        invitado
                                      </span>
                                    ) : null}
                                  </span>
                                </td>
                                <td className="py-2 text-right font-display tabular">
                                  {r.bestScore}
                                </td>
                                <td className="hidden py-2 text-right text-xs text-[var(--color-muted-foreground)] sm:table-cell">
                                  {formatRelative(r.playedAt)}
                                </td>
                                <td className="py-2 text-right">
                                  <button
                                    type="button"
                                    title="Borrar esta puntuación"
                                    disabled={pending}
                                    onClick={() =>
                                      run(
                                        () => deleteScore(r.id),
                                        "Borrar puntuación",
                                        `Borrar la puntuación de ${r.displayName} (${r.bestScore} pts)?`,
                                      )
                                    }
                                    className="rounded p-1 text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] disabled:opacity-50"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </section>

      <section>
        <header className="mb-3 flex items-center gap-2">
          <AlertTriangle className="size-4 text-[var(--color-danger)]" />
          <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-danger)]">
            Zona destructiva
          </h2>
        </header>
        <Card className="border-[var(--color-danger)]/40 bg-[color-mix(in_oklch,var(--color-danger)_3%,var(--color-surface))]">
          <CardHeader>
            <CardTitle className="text-[var(--color-danger)]">
              Resetear todos los minijuegos
            </CardTitle>
            <CardDescription>
              Vacía la tabla `minigame_scores` por completo. Todos los rankings de
              todos los minijuegos quedan a cero. Las identidades (usuarios y
              apodos) se mantienen — solo se borran las puntuaciones. Útil al
              relanzar la sección o entre torneos.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              className="border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:border-[var(--color-danger)] hover:bg-[color-mix(in_oklch,var(--color-danger)_8%,transparent)] hover:text-[var(--color-danger)]"
              onClick={() =>
                run(
                  resetAllMinigames,
                  "Reset minijuegos global",
                  "Vas a borrar TODAS las puntuaciones de TODOS los minijuegos. ¿Seguro?",
                )
              }
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              Resetear minijuegos
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      <div className="flex items-center gap-1 text-[var(--color-muted-foreground)]">
        {icon}
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.24em]">
          {label}
        </span>
      </div>
      <p className="mt-0.5 truncate font-display text-xl tabular leading-tight">
        {value}
      </p>
      {sub ? (
        <p className="truncate font-editorial text-[0.65rem] italic text-[var(--color-muted-foreground)]">
          {sub}
        </p>
      ) : null}
    </div>
  );
}
