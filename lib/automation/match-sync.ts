import { and, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appSettings,
  matchScorers,
  matches,
  pendingScorers,
  players,
} from "@/lib/db/schema";
import {
  fetchFixtureById,
  fetchFixtureEvents,
  isAbnormalStatus,
  mapEventsToScorers,
  parseFixture,
  type ProviderScorer,
  type MatchSnapshot,
  diffMatch,
} from "@/lib/sports/api-football";
import { applyMatchUpdate, type MatchScorerInput } from "@/lib/automation/apply-match-update";
import { sendTelegramMessage, escapeHTML } from "@/lib/telegram/notify";

const SYNC_OK_KEY = "sync_matches_last_ok";
// Cuánto antes/después del kickoff consideramos un partido "en ventana".
const WINDOW_BEFORE_MS = 10 * 60 * 1000;
const WINDOW_AFTER_MS = 3.5 * 60 * 60 * 1000; // cubre prórroga + penaltis

function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function alert(msg: string): Promise<void> {
  await sendTelegramMessage(`⚠️ <b>Sync partidos</b>\n${msg}`).catch(() => {});
}

// ─────────────────────────── Resolución de jugadores ───────────────────────────

type ResolveResult = {
  resolved: MatchScorerInput[];
  pending: {
    teamId: number | null;
    providerPlayerId: number | null;
    playerName: string;
    minute: number | null;
    isOwnGoal: boolean;
    isPenalty: boolean;
  }[];
};

/**
 * Mapea goleadores del proveedor a nuestros `players.id`:
 *  1. Por `players.provider_player_id` (caché exacta).
 *  2. Por (equipo, apellido normalizado) si es ÚNICO en la plantilla → se
 *     cachea el provider_player_id para futuras veces.
 *  3. Si no casa con confianza → va a `pending` (no puntúa hasta reconciliar).
 * Nunca adivina: ante ambigüedad, pending.
 */
export async function resolveScorers(
  homeTeamId: number,
  awayTeamId: number,
  providerScorers: ProviderScorer[],
): Promise<ResolveResult> {
  const resolved: MatchScorerInput[] = [];
  const pending: ResolveResult["pending"] = [];

  // Plantillas de ambos equipos (una sola query).
  const roster = await db
    .select({ id: players.id, teamId: players.teamId, name: players.name, providerPlayerId: players.providerPlayerId })
    .from(players)
    .where(inArray(players.teamId, [homeTeamId, awayTeamId]));

  for (const ps of providerScorers) {
    const teamId = ps.side === "home" ? homeTeamId : awayTeamId;
    const teamPlayers = roster.filter((p) => p.teamId === teamId);

    // 1) Caché por id del proveedor.
    let match = ps.providerPlayerId
      ? teamPlayers.find((p) => p.providerPlayerId === ps.providerPlayerId)
      : undefined;

    // 2) Por apellido normalizado, único en el equipo.
    if (!match) {
      const surname = normName(ps.playerName).split(" ").pop() ?? "";
      if (surname.length >= 3) {
        const cands = teamPlayers.filter((p) => normName(p.name).split(" ").includes(surname));
        if (cands.length === 1) {
          match = cands[0];
          // Cachear para próximas veces.
          if (ps.providerPlayerId && match.providerPlayerId !== ps.providerPlayerId) {
            await db
              .update(players)
              .set({ providerPlayerId: ps.providerPlayerId })
              .where(eq(players.id, match.id))
              .catch(() => {});
          }
        }
      }
    }

    if (match) {
      resolved.push({
        playerId: match.id,
        teamId,
        minute: ps.minute,
        isOwnGoal: ps.isOwnGoal,
        isPenalty: ps.isPenalty,
      });
    } else {
      pending.push({
        teamId,
        providerPlayerId: ps.providerPlayerId,
        playerName: ps.playerName,
        minute: ps.minute,
        isOwnGoal: ps.isOwnGoal,
        isPenalty: ps.isPenalty,
      });
    }
  }

  return { resolved, pending };
}

// ─────────────────────────── Snapshots / dirty-check ───────────────────────────

function scorerKey(side: "home" | "away", minute: number | null, og: boolean, pen: boolean): string {
  return `${side}:${minute ?? "?"}:${og ? "o" : ""}${pen ? "p" : ""}`;
}

async function dbSnapshot(matchId: number, homeTeamId: number, awayTeamId: number): Promise<MatchSnapshot> {
  const [m] = await db
    .select({
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      wentToPens: matches.wentToPens,
      homePenScore: matches.homeScorePen,
      awayPenScore: matches.awayScorePen,
    })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  const sc = await db
    .select({ teamId: matchScorers.teamId, minute: matchScorers.minute, og: matchScorers.isOwnGoal, pen: matchScorers.isPenalty })
    .from(matchScorers)
    .where(eq(matchScorers.matchId, matchId));
  return {
    status: m.status,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    wentToPens: m.wentToPens,
    homePenScore: m.homePenScore,
    awayPenScore: m.awayPenScore,
    scorerKeys: sc.map((s) =>
      scorerKey(s.teamId === homeTeamId ? "home" : "away", s.minute, s.og, s.pen),
    ),
  };
}

// ─────────────────────────── Sync de un partido ───────────────────────────

type Candidate = {
  id: number;
  providerFixtureId: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  status: string;
};

async function syncOne(c: Candidate): Promise<{ changed: boolean; pendingCount: number }> {
  if (c.homeTeamId == null || c.awayTeamId == null) return { changed: false, pendingCount: 0 };

  const item = await fetchFixtureById(c.providerFixtureId);
  if (!item) return { changed: false, pendingCount: 0 };
  if (isAbnormalStatus(item.fixture.status.short)) {
    await alert(`Partido #${c.id} en estado anómalo "${item.fixture.status.short}" — revisar a mano.`);
    return { changed: false, pendingCount: 0 };
  }

  const f = parseFixture(item);
  const events = f.status === "scheduled" ? [] : await fetchFixtureEvents(c.providerFixtureId);
  const providerScorers = mapEventsToScorers(events, f.homeProviderTeamId, f.awayProviderTeamId);

  const next: MatchSnapshot = {
    status: f.status,
    homeScore: f.homeScore,
    awayScore: f.awayScore,
    wentToPens: f.wentToPens,
    homePenScore: f.homePenScore,
    awayPenScore: f.awayPenScore,
    scorerKeys: providerScorers.map((s) => scorerKey(s.side, s.minute, s.isOwnGoal, s.isPenalty)),
  };
  const current = await dbSnapshot(c.id, c.homeTeamId, c.awayTeamId);
  if (!diffMatch(current, next)) {
    // Sin cambios: solo sella lastSyncedAt para el watchdog.
    await db.update(matches).set({ lastSyncedAt: new Date() }).where(eq(matches.id, c.id));
    return { changed: false, pendingCount: 0 };
  }

  const { resolved, pending } = await resolveScorers(c.homeTeamId, c.awayTeamId, providerScorers);

  const winnerTeamId =
    f.winnerSide === "home" ? c.homeTeamId : f.winnerSide === "away" ? c.awayTeamId : null;

  await applyMatchUpdate(
    {
      matchId: c.id,
      homeScore: f.homeScore ?? 0,
      awayScore: f.awayScore ?? 0,
      status: f.status,
      wentToPens: f.wentToPens,
      homeScorePen: f.homePenScore,
      awayScorePen: f.awayPenScore,
      winnerTeamId,
      scorers: resolved,
    },
    { actor: "auto" },
  );

  // Goleadores no mapeados → cola de reconciliación (idempotente por dedup).
  if (pending.length > 0) {
    await db
      .insert(pendingScorers)
      .values(pending.map((p) => ({ ...p, matchId: c.id })))
      .onConflictDoNothing();
    await alert(
      `Partido #${c.id}: ${pending.length} goleador(es) sin mapear → en espera de reconciliación: ${pending
        .map((p) => escapeHTML(p.playerName))
        .join(", ")}`,
    );
  }

  return { changed: true, pendingCount: pending.length };
}

// ─────────────────────────── Entradas públicas (cron) ───────────────────────────

export type SyncReport = {
  windowCount: number;
  synced: number;
  changed: number;
  pending: number;
  errors: number;
};

/** Sincroniza los partidos en ventana en vivo. Barato si no hay ninguno. */
export async function syncLiveMatches(): Promise<SyncReport> {
  const now = Date.now();
  const from = new Date(now - WINDOW_AFTER_MS);
  const to = new Date(now + WINDOW_BEFORE_MS);

  // Candidatos: con fixture mapeado, en modo auto, no finalizados, y con
  // kickoff dentro de la ventana (o ya en vivo).
  const candidates = (await db
    .select({
      id: matches.id,
      providerFixtureId: matches.providerFixtureId,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      status: matches.status,
    })
    .from(matches)
    .where(
      and(
        ne(matches.status, "finished"),
        eq(matches.resultSource, "auto"),
        sql`${matches.providerFixtureId} is not null`,
        sql`${matches.scheduledAt} between ${from} and ${to}`,
      ),
    )) as Candidate[];

  const report: SyncReport = { windowCount: candidates.length, synced: 0, changed: 0, pending: 0, errors: 0 };
  if (candidates.length === 0) {
    await markSyncOk();
    return report;
  }

  for (const c of candidates) {
    try {
      const r = await syncOne(c);
      report.synced++;
      if (r.changed) report.changed++;
      report.pending += r.pendingCount;
    } catch (e) {
      report.errors++;
      await alert(`Error sincronizando partido #${c.id}: ${escapeHTML((e as Error).message)}`);
    }
  }
  await markSyncOk();
  return report;
}

/** Watchdog: avisa de partidos que deberían haber empezado/terminado. */
export async function runWatchdog(): Promise<void> {
  const now = Date.now();
  // Deberían estar en vivo y siguen 'scheduled' (> 12 min tras el kickoff).
  const stale = await db
    .select({ id: matches.id, code: matches.code })
    .from(matches)
    .where(
      and(
        eq(matches.status, "scheduled"),
        eq(matches.resultSource, "auto"),
        sql`${matches.providerFixtureId} is not null`,
        lt(matches.scheduledAt, new Date(now - 12 * 60 * 1000)),
        sql`${matches.scheduledAt} > ${new Date(now - WINDOW_AFTER_MS)}`,
      ),
    );
  for (const m of stale) {
    await alert(`Partido ${m.code} (#${m.id}) debería haber empezado y sigue "programado". ¿Fuente caída?`);
  }
  // Lleva demasiado en vivo.
  const stuck = await db
    .select({ id: matches.id, code: matches.code })
    .from(matches)
    .where(and(eq(matches.status, "live"), lt(matches.scheduledAt, new Date(now - WINDOW_AFTER_MS))));
  for (const m of stuck) {
    await alert(`Partido ${m.code} (#${m.id}) lleva demasiado tiempo "en vivo". Revisar.`);
  }
}

async function markSyncOk(): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key: SYNC_OK_KEY, valueJson: { at: new Date().toISOString() } })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { valueJson: { at: new Date().toISOString() }, updatedAt: new Date() },
    });
}
