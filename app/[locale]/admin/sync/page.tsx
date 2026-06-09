import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings, matches, pendingScorers, players } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { ForceSyncButton, OpenR32Button, SourceToggle } from "./sync-controls";
import { PendingScorerRow } from "./pending-row";
import {
  computeThirds,
  getR32TransitionState,
} from "@/lib/automation/third-place-population";
import { WINNER_TO_R32_MATCH } from "@/lib/bracket/third-place";

export const metadata = { title: "Sync en vivo · Admin" };
export const dynamic = "force-dynamic";

export default async function SyncPage() {
  await requireAdmin();

  const [lastOkRow] = await db
    .select({ v: appSettings.valueJson })
    .from(appSettings)
    .where(eq(appSettings.key, "sync_matches_last_ok"))
    .limit(1);
  const lastOk = (lastOkRow?.v as { at?: string } | undefined)?.at ?? null;

  const matchRows = await db
    .select({
      id: matches.id,
      code: matches.code,
      status: matches.status,
      scheduledAt: matches.scheduledAt,
      providerFixtureId: matches.providerFixtureId,
      resultSource: matches.resultSource,
      lastSyncedAt: matches.lastSyncedAt,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .orderBy(asc(matches.scheduledAt));

  const mapped = matchRows.filter((m) => m.providerFixtureId != null).length;

  // Goleadores en espera de reconciliación + jugadores del equipo para el selector.
  const pend = await db
    .select()
    .from(pendingScorers)
    .orderBy(desc(pendingScorers.createdAt));
  const teamIds = [...new Set(pend.map((p) => p.teamId).filter((x): x is number => x != null))];
  const roster = teamIds.length
    ? await db
        .select({ id: players.id, teamId: players.teamId, name: players.name, jerseyNumber: players.jerseyNumber })
        .from(players)
        .where(inArray(players.teamId, teamIds))
        .orderBy(asc(players.jerseyNumber))
    : [];
  const matchById = new Map(matchRows.map((m) => [m.id, m.code]));

  // ─── Transición a R32 (mejores terceros) ───
  const [{ thirds, result }, transition] = await Promise.all([
    computeThirds(),
    getR32TransitionState(),
  ]);
  const teamNameByGroup = new Map(thirds.map((t) => [t.group, t.teamName]));
  const r32Open = Boolean(transition.openedAt);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Sync en vivo"
        description={`${mapped}/${matchRows.length} partidos mapeados al proveedor · último sync OK: ${lastOk ? formatDateTime(lastOk) : "—"}`}
      />

      <div className="flex items-center gap-3">
        <ForceSyncButton />
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
          El cron corre cada minuto; usa esto para forzar.
        </span>
      </div>

      {/* ─── Transición a R32 ─── */}
      <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl tracking-tight">
            Transición a dieciseisavos (R32){" "}
            {r32Open ? (
              <Badge variant="success">abierto</Badge>
            ) : result.ambiguousCut ? (
              <Badge variant="danger">empate en el corte</Badge>
            ) : result.complete && result.allocation ? (
              <Badge variant="outline">listo para abrir</Badge>
            ) : (
              <Badge variant="outline">{thirds.length}/12 terceros</Badge>
            )}
          </h2>
          {result.complete && !result.ambiguousCut && result.allocation ? (
            <OpenR32Button alreadyOpen={r32Open} />
          ) : null}
        </div>

        {result.ambiguousCut ? (
          <p className="font-editorial text-sm italic text-[var(--color-warning)]">
            Empate a puntos, diferencia de goles y goles a favor justo en el 8.º/9.º puesto.
            Desempata a mano en Operaciones › Mejores terceros antes de abrir.
          </p>
        ) : (
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {r32Open
              ? "Las predicciones de R32 están abiertas. «Reaplicar terceros» reescribe las casillas si una corrección cambió la clasificación."
              : result.complete && result.allocation
                ? "Cuadro calculado por el Anexo C de FIFA. Revisa los 8 terceros y ábrelo a los jugadores."
                : "Se completa al cerrar los 12 grupos. La clasificación es provisional."}
          </p>
        )}

        {thirds.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Ranking de terceros */}
            <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
              <div className="grid grid-cols-[24px_1fr_28px_36px_32px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                <span>#</span>
                <span>Tercero</span>
                <span className="text-right">Pts</span>
                <span className="text-right">DG</span>
                <span className="text-right">GF</span>
              </div>
              {result.ranked.map((r) => (
                <div
                  key={r.group}
                  className={`grid grid-cols-[24px_1fr_28px_36px_32px] items-center gap-2 border-b border-[var(--color-border)] px-3 py-1.5 text-sm last:border-b-0 ${
                    r.qualifies ? "bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)]" : "opacity-60"
                  }`}
                >
                  <span className={`font-display tabular ${r.qualifies ? "text-[var(--color-arena)]" : "text-[var(--color-muted-foreground)]"}`}>
                    {r.rank}
                  </span>
                  <span className="truncate">
                    <span className="font-mono text-[0.6rem] text-[var(--color-muted-foreground)]">{r.group}</span>{" "}
                    {teamNameByGroup.get(r.group) ?? r.group}
                  </span>
                  <span className="text-right font-mono text-xs tabular">{r.points}</span>
                  <span className="text-right font-mono text-xs tabular">
                    {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                  </span>
                  <span className="text-right font-mono text-xs tabular">{r.goalsFor}</span>
                </div>
              ))}
            </div>

            {/* Asignación de casillas R32 */}
            <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
              <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                Casilla R32 (Anexo C)
              </div>
              {result.allocation ? (
                Object.entries(WINNER_TO_R32_MATCH).map(([winner, code]) => {
                  const group = result.allocation![code];
                  return (
                    <div
                      key={code}
                      className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-1.5 text-sm last:border-b-0"
                    >
                      <span className="font-mono text-[0.65rem] text-[var(--color-muted-foreground)]">
                        {code} · 1{winner} vs
                      </span>
                      <span className="truncate text-right">
                        <span className="font-mono text-[0.6rem] text-[var(--color-muted-foreground)]">3{group}</span>{" "}
                        {teamNameByGroup.get(group) ?? "—"}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="px-3 py-4 text-center font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                  Se calcula al cerrar los 12 grupos.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {/* ─── Goleadores en espera ─── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-tight">
          Goleadores en espera{" "}
          {pend.length > 0 ? <Badge variant="danger">{pend.length}</Badge> : null}
        </h2>
        {pend.length === 0 ? (
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Nada pendiente. Los goleadores que no casen con un jugador aparecerán aquí para asignarlos a mano.
          </p>
        ) : (
          <div className="space-y-2">
            {pend.map((p) => (
              <PendingScorerRow
                key={p.id}
                pendingId={p.id}
                matchCode={matchById.get(p.matchId) ?? `#${p.matchId}`}
                playerName={p.playerName}
                minute={p.minute}
                isOwnGoal={p.isOwnGoal}
                isPenalty={p.isPenalty}
                teamPlayers={roster
                  .filter((r) => r.teamId === p.teamId)
                  .map((r) => ({ id: r.id, label: `${r.jerseyNumber ?? "·"} · ${r.name}` }))}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── Estado por partido ─── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-tight">Partidos</h2>
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partido</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden sm:table-cell">Proveedor</TableHead>
                <TableHead className="hidden md:table-cell">Último sync</TableHead>
                <TableHead className="text-right">Fuente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchRows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <span className="font-mono text-xs">{m.code}</span>
                    {m.status === "finished" || m.status === "live" ? (
                      <span className="ml-2 font-display tabular text-sm">
                        {m.homeScore ?? "–"}–{m.awayScore ?? "–"}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={m.status === "live" ? "danger" : m.status === "finished" ? "success" : "outline"}
                    >
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {m.providerFixtureId ? (
                      <span className="font-mono text-[0.65rem] text-[var(--color-muted-foreground)]">
                        #{m.providerFixtureId}
                      </span>
                    ) : (
                      <Badge variant="outline">sin mapear</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {m.lastSyncedAt ? formatDateTime(m.lastSyncedAt) : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <SourceToggle matchId={m.id} source={m.resultSource} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
