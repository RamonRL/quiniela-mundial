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
import { ForceSyncButton, SourceToggle } from "./sync-controls";
import { PendingScorerRow } from "./pending-row";

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
