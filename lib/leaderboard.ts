import { unstable_cache } from "next/cache";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  leagueMemberships,
  pointsLedger,
  predBracketSlot,
  profiles,
  matches,
} from "@/lib/db/schema";
import { compareForRanking } from "@/lib/scoring/tiebreaker";
import type { PredictionMode } from "@/lib/prediction-modes";

/**
 * TTL del leaderboard cacheado a nivel de liga. Suficientemente corto para
 * que los puntos se vean "en directo" durante una jornada de partidos, y
 * suficientemente largo para que 5 usuarios concurrentes de la misma liga
 * pegando al dashboard compartan una sola query agregada.
 *
 * Si el admin recomputa puntos, los cambios tardan como mucho este TTL en
 * verse. Para invalidar inmediato, llamar `revalidateTag("leaderboard")`
 * tras el recompute.
 */
const LEADERBOARD_CACHE_SECONDS = 30;

export type LeaderboardEntry = {
  userId: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  exactScoresCount: number;
  knockoutPoints: number;
  championCorrect: boolean;
};

type GlobalRow = {
  userId: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  exactScoresCount: number;
};

/**
 * Ranking GLOBAL por modo de predicción. Las quinielas públicas no tienen
 * ranking propio: quien juega en cualquier liga de un modo (pública o
 * privada) compite aquí. La puntuación de cada usuario es la de su MEJOR
 * liga de ese modo (no la suma) — DISTINCT ON elige por usuario la liga con
 * más puntos (desempate por marcadores exactos), y luego ordenamos el
 * conjunto por esa mejor puntuación.
 *
 * Cacheado 30s por modo. Devuelve [] si falla (defensivo, como el de liga).
 */
export async function loadGlobalLeaderboard(
  mode: PredictionMode,
): Promise<GlobalRow[]> {
  const cached = unstable_cache(
    () => loadGlobalLeaderboardRaw(mode),
    ["global-leaderboard", mode],
    { revalidate: LEADERBOARD_CACHE_SECONDS, tags: ["leaderboard", `global-leaderboard:${mode}`] },
  );
  return cached();
}

async function loadGlobalLeaderboardRaw(mode: PredictionMode): Promise<GlobalRow[]> {
  try {
    const rows = await db.execute<GlobalRow>(sql`
      WITH per_league AS (
        SELECT
          lm.user_id                                                                   AS "userId",
          coalesce(sum(pl.points), 0)::int                                             AS "leaguePoints",
          count(*) filter (
            where pl.source = 'match_result' and pl.source_ref->>'exact' = 'true'
          )::int                                                                       AS "exact"
        FROM league_memberships lm
        JOIN leagues l ON l.id = lm.league_id AND l.prediction_mode = ${mode}
        LEFT JOIN points_ledger pl
          ON pl.user_id = lm.user_id AND pl.league_id = lm.league_id
        GROUP BY lm.user_id, lm.league_id
      ),
      best AS (
        SELECT DISTINCT ON ("userId")
          "userId", "leaguePoints" AS "totalPoints", "exact" AS "exactScoresCount"
        FROM per_league
        ORDER BY "userId", "leaguePoints" DESC, "exact" DESC
      )
      SELECT
        b."userId"            AS "userId",
        p.email               AS "email",
        p.nickname            AS "nickname",
        p.avatar_url          AS "avatarUrl",
        b."totalPoints"       AS "totalPoints",
        b."exactScoresCount"  AS "exactScoresCount"
      FROM best b
      JOIN profiles p ON p.id = b."userId"
      ORDER BY b."totalPoints" DESC, b."exactScoresCount" DESC, p.created_at ASC
    `);
    return rows as GlobalRow[];
  } catch (err) {
    console.error("loadGlobalLeaderboard failed:", err);
    return [];
  }
}

/**
 * Leaderboard agregado en UNA sola query usando el query builder de Drizzle.
 * Reemplaza al patrón antiguo de traer todos los `profiles` + todo
 * `points_ledger` y procesarlo en JS, que escalaba mal en la liga pública.
 *
 * Si `withChampionCorrect=true` también determina quién acertó al campeón
 * (requiere que la final esté resuelta).
 *
 * Defensivo: si la query falla (statement timeout, etc.) devuelve [] en
 * lugar de propagar — el dashboard renderiza el podio vacío sin crashear.
 */
export async function loadLeaderboard(
  leagueId: number,
  options: { withChampionCorrect?: boolean } = {},
): Promise<LeaderboardEntry[]> {
  // Cacheamos por (leagueId, withChampionCorrect) durante 30s. Cinco
  // usuarios concurrentes de la misma liga → una sola query agregada en
  // vez de cinco. El champion-correct cambia solo cuando finaliza la
  // Final, así que lo metemos en la clave de caché para no servir un
  // resultado pre-resolución cuando alguien pide la versión "con campeón".
  const flag = options.withChampionCorrect ? "1" : "0";
  const cached = unstable_cache(
    () => loadLeaderboardRaw(leagueId, options),
    ["leaderboard", String(leagueId), flag],
    { revalidate: LEADERBOARD_CACHE_SECONDS, tags: ["leaderboard", `leaderboard:${leagueId}`] },
  );
  return cached();
}

async function loadLeaderboardRaw(
  leagueId: number,
  options: { withChampionCorrect?: boolean },
): Promise<LeaderboardEntry[]> {
  try {
    return await loadLeaderboardUnsafe(leagueId, options);
  } catch (err) {
    console.error("loadLeaderboard failed:", err);
    return [];
  }
}

async function loadLeaderboardUnsafe(
  leagueId: number,
  options: { withChampionCorrect?: boolean },
): Promise<LeaderboardEntry[]> {
  const rows = await db
    .select({
      userId: profiles.id,
      email: profiles.email,
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
      totalPoints: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int`,
      exactScoresCount: sql<number>`count(*) filter (where ${pointsLedger.source} = 'match_result' and ${pointsLedger.sourceRef}->>'exact' = 'true')::int`,
      knockoutPoints: sql<number>`coalesce(sum(${pointsLedger.points}) filter (where ${pointsLedger.source} = 'bracket_slot' or (${pointsLedger.source} = 'match_result' and ${pointsLedger.sourceRef}->>'phase' = 'ko')), 0)::int`,
    })
    .from(leagueMemberships)
    .innerJoin(profiles, eq(profiles.id, leagueMemberships.userId))
    .leftJoin(
      pointsLedger,
      and(
        eq(pointsLedger.userId, profiles.id),
        eq(pointsLedger.leagueId, leagueMemberships.leagueId),
      ),
    )
    .where(eq(leagueMemberships.leagueId, leagueId))
    .groupBy(profiles.id, profiles.email, profiles.nickname, profiles.avatarUrl)
    .orderBy(
      desc(sql`coalesce(sum(${pointsLedger.points}), 0)`),
      desc(sql`count(*) filter (where ${pointsLedger.source} = 'match_result' and ${pointsLedger.sourceRef}->>'exact' = 'true')`),
      desc(sql`coalesce(sum(${pointsLedger.points}) filter (where ${pointsLedger.source} = 'bracket_slot' or (${pointsLedger.source} = 'match_result' and ${pointsLedger.sourceRef}->>'phase' = 'ko')), 0)`),
    );

  const championCorrectByUser = new Map<string, boolean>();
  if (options.withChampionCorrect) {
    const [officialWinner] = await db
      .select({ winnerTeamId: matches.winnerTeamId })
      .from(matches)
      .where(and(eq(matches.stage, "final"), sql`${matches.winnerTeamId} is not null`))
      .orderBy(desc(matches.scheduledAt))
      .limit(1);
    const winnerTeamId = officialWinner?.winnerTeamId ?? null;
    if (winnerTeamId != null && rows.length > 0) {
      const champPicks = await db
        .select({
          userId: predBracketSlot.userId,
          predictedTeamId: predBracketSlot.predictedTeamId,
        })
        .from(predBracketSlot)
        .where(
          and(
            eq(predBracketSlot.leagueId, leagueId),
            eq(predBracketSlot.stage, "final"),
            eq(predBracketSlot.slotPosition, 0),
            inArray(
              predBracketSlot.userId,
              rows.map((r) => r.userId),
            ),
          ),
        );
      for (const p of champPicks) {
        championCorrectByUser.set(p.userId, p.predictedTeamId === winnerTeamId);
      }
    }
  }

  const entries: LeaderboardEntry[] = rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    nickname: r.nickname,
    avatarUrl: r.avatarUrl,
    totalPoints: r.totalPoints,
    exactScoresCount: r.exactScoresCount,
    knockoutPoints: r.knockoutPoints,
    championCorrect: championCorrectByUser.get(r.userId) ?? false,
  }));

  // SQL ya ordena por (total, exact, knockout). Si pedimos championCorrect,
  // reordenamos empates con el comparador canónico (incluye el bit de campeón).
  if (options.withChampionCorrect) {
    entries.sort((a, b) => compareForRanking(a, b));
  }
  return entries;
}

// ─────────────────────────────────────────────────────────────────────
//  Departamentos · ranking por media de puntos (Plan empresa)
// ─────────────────────────────────────────────────────────────────────

export type DepartmentRankingEntry = {
  departmentId: number;
  name: string;
  emoji: string | null;
  color: string | null;
  totalMembers: number;
  activeMembers: number;
  totalPoints: number;
  /** Media sobre activeMembers (>0). 0 si no hay activos. */
  avgPoints: number;
  exactScoresCount: number;
  knockoutPoints: number;
};

const DEPT_CACHE_SECONDS = 30;

/**
 * Ranking de departamentos de una liga premium. La métrica principal es
 * la MEDIA de puntos sobre los miembros activos (≥1 predicción en
 * cualquiera de las pred_* tables) — un dept. con 5 personas no pierde
 * automáticamente contra uno con 50.
 *
 * Solo se promedia sobre activos: si una empresa tiene 200 inscritos pero
 * 50 nunca enviaron ni un pick, esos 150 NO penalizan la media de su dept.
 *
 * Edge case: dept. con 0 miembros activos → avgPoints=0, queda al final.
 */
export async function loadDepartmentRankings(
  leagueId: number,
): Promise<DepartmentRankingEntry[]> {
  const cached = unstable_cache(
    () => loadDepartmentRankingsUnsafe(leagueId),
    ["department-rankings", String(leagueId)],
    {
      revalidate: DEPT_CACHE_SECONDS,
      tags: ["leaderboard", `leaderboard:${leagueId}`, `departments:${leagueId}`],
    },
  );
  try {
    return await cached();
  } catch (err) {
    console.error("loadDepartmentRankings failed:", err);
    return [];
  }
}

async function loadDepartmentRankingsUnsafe(
  leagueId: number,
): Promise<DepartmentRankingEntry[]> {
  // Raw SQL: combinar 5 pred_* tables en una sola CTE y dejar que el
  // planner de Postgres ordene la query. Drizzle no expresa CTE así de
  // fluidamente, y el coste es bajo porque el caché lo absorbe.
  const result = await db.execute(sql`
    WITH active_members AS (
      SELECT DISTINCT user_id FROM pred_match_result WHERE league_id = ${leagueId}
      UNION SELECT DISTINCT user_id FROM pred_group_ranking WHERE league_id = ${leagueId}
      UNION SELECT DISTINCT user_id FROM pred_bracket_slot WHERE league_id = ${leagueId}
      UNION SELECT DISTINCT user_id FROM pred_tournament_top_scorer WHERE league_id = ${leagueId}
      UNION SELECT DISTINCT user_id FROM pred_special WHERE league_id = ${leagueId}
    ),
    points_by_user AS (
      SELECT
        user_id,
        coalesce(sum(points), 0)::int AS total_points,
        count(*) FILTER (WHERE source = 'match_result' AND source_ref->>'exact' = 'true')::int AS exact_count,
        coalesce(sum(points) FILTER (WHERE source = 'bracket_slot' OR (source = 'match_result' AND source_ref->>'phase' = 'ko')), 0)::int AS knockout_points
      FROM points_ledger
      WHERE league_id = ${leagueId}
      GROUP BY user_id
    )
    SELECT
      d.id AS department_id,
      d.name,
      d.emoji,
      d.color,
      (SELECT count(*)::int FROM league_memberships lm WHERE lm.league_id = ${leagueId} AND lm.department_id = d.id) AS total_members,
      (SELECT count(*)::int FROM league_memberships lm JOIN active_members am ON am.user_id = lm.user_id WHERE lm.league_id = ${leagueId} AND lm.department_id = d.id) AS active_members,
      coalesce((
        SELECT sum(p.total_points)::int FROM league_memberships lm
        JOIN active_members am ON am.user_id = lm.user_id
        LEFT JOIN points_by_user p ON p.user_id = lm.user_id
        WHERE lm.league_id = ${leagueId} AND lm.department_id = d.id
      ), 0) AS total_points,
      coalesce((
        SELECT sum(p.exact_count)::int FROM league_memberships lm
        JOIN active_members am ON am.user_id = lm.user_id
        LEFT JOIN points_by_user p ON p.user_id = lm.user_id
        WHERE lm.league_id = ${leagueId} AND lm.department_id = d.id
      ), 0) AS exact_count,
      coalesce((
        SELECT sum(p.knockout_points)::int FROM league_memberships lm
        JOIN active_members am ON am.user_id = lm.user_id
        LEFT JOIN points_by_user p ON p.user_id = lm.user_id
        WHERE lm.league_id = ${leagueId} AND lm.department_id = d.id
      ), 0) AS knockout_points
    FROM league_departments d
    WHERE d.league_id = ${leagueId}
    ORDER BY d.created_at ASC
  `);

  const rows = result as unknown as Array<{
    department_id: number;
    name: string;
    emoji: string | null;
    color: string | null;
    total_members: number;
    active_members: number;
    total_points: number;
    exact_count: number;
    knockout_points: number;
  }>;

  const entries: DepartmentRankingEntry[] = rows.map((r) => ({
    departmentId: r.department_id,
    name: r.name,
    emoji: r.emoji,
    color: r.color,
    totalMembers: r.total_members,
    activeMembers: r.active_members,
    totalPoints: r.total_points,
    avgPoints:
      r.active_members > 0
        ? Math.round((r.total_points / r.active_members) * 100) / 100
        : 0,
    exactScoresCount: r.exact_count,
    knockoutPoints: r.knockout_points,
  }));

  // Orden final: avg desc, luego exact por miembro activo, luego KO.
  entries.sort((a, b) => {
    if (b.avgPoints !== a.avgPoints) return b.avgPoints - a.avgPoints;
    const aExactAvg = a.activeMembers > 0 ? a.exactScoresCount / a.activeMembers : 0;
    const bExactAvg = b.activeMembers > 0 ? b.exactScoresCount / b.activeMembers : 0;
    if (bExactAvg !== aExactAvg) return bExactAvg - aExactAvg;
    return b.knockoutPoints - a.knockoutPoints;
  });
  return entries;
}

// ─────────────────────────────────────────────────────────────────────
//  Champions de Empresas · ranking global de ligas premium
//  DESACTIVADO — feature retirada hasta tener volumen de empresas que
//  justifique mantenerla. El código queda escondido tras un guard para
//  poder reactivarlo más adelante sin reescribirlo. Si decides borrarlo
//  definitivamente, quita esta sección entera y el `unstable_cache` no
//  importado se va de paso.
// ─────────────────────────────────────────────────────────────────────

export type ChampionRankingEntry = {
  leagueId: number;
  leagueName: string;
  logoUrl: string | null;
  tier: string;
  totalMembers: number;
  activeMembers: number;
  totalPoints: number;
  /** Media sobre activeMembers. */
  avgPoints: number;
  exactScoresCount: number;
  knockoutPoints: number;
  /** Fecha en la que la liga activó su plan de pago — tiebreaker final. */
  paidAt: Date | null;
};

const CHAMPIONS_CACHE_SECONDS = 60;

/** Feature flag de la Champions de Empresas. Activar de nuevo cuando
 *  haya masa crítica de empresas con plan activo. */
const CHAMPIONS_DE_EMPRESAS_ENABLED = false;

/**
 * Ranking público de la "Champions de Empresas" — todas las ligas con
 * plan de pago activo compiten por media de puntos. Devuelve siempre
 * lista vacía mientras `CHAMPIONS_DE_EMPRESAS_ENABLED` esté en false.
 */
export async function loadChampionsRanking(): Promise<ChampionRankingEntry[]> {
  if (!CHAMPIONS_DE_EMPRESAS_ENABLED) return [];
  const cached = unstable_cache(
    () => loadChampionsRankingUnsafe(),
    ["champions-ranking"],
    { revalidate: CHAMPIONS_CACHE_SECONDS, tags: ["champions"] },
  );
  try {
    return await cached();
  } catch (err) {
    console.error("loadChampionsRanking failed:", err);
    return [];
  }
}

async function loadChampionsRankingUnsafe(): Promise<ChampionRankingEntry[]> {
  // Igual filosofía que el ranking de departamentos pero agrupando por
  // liga. Activo = miembro con ≥1 row en cualquier pred_* table de SU
  // liga (no global).
  const result = await db.execute(sql`
    WITH active_per_league AS (
      SELECT DISTINCT user_id, league_id FROM pred_match_result
      UNION SELECT DISTINCT user_id, league_id FROM pred_group_ranking
      UNION SELECT DISTINCT user_id, league_id FROM pred_bracket_slot
      UNION SELECT DISTINCT user_id, league_id FROM pred_tournament_top_scorer
      UNION SELECT DISTINCT user_id, league_id FROM pred_special
    )
    SELECT
      l.id AS league_id,
      l.name AS league_name,
      l.logo_url,
      l.tier,
      l.paid_at,
      (SELECT count(*)::int FROM league_memberships lm WHERE lm.league_id = l.id) AS total_members,
      (SELECT count(DISTINCT a.user_id)::int FROM active_per_league a WHERE a.league_id = l.id) AS active_members,
      coalesce((
        SELECT sum(pl.points)::int FROM points_ledger pl
        WHERE pl.league_id = l.id
        AND EXISTS (SELECT 1 FROM active_per_league a WHERE a.user_id = pl.user_id AND a.league_id = l.id)
      ), 0) AS total_points,
      coalesce((
        SELECT count(*)::int FROM points_ledger pl
        WHERE pl.league_id = l.id
        AND pl.source = 'match_result' AND pl.source_ref->>'exact' = 'true'
        AND EXISTS (SELECT 1 FROM active_per_league a WHERE a.user_id = pl.user_id AND a.league_id = l.id)
      ), 0) AS exact_count,
      coalesce((
        SELECT sum(pl.points)::int FROM points_ledger pl
        WHERE pl.league_id = l.id
        AND (pl.source = 'bracket_slot' OR (pl.source = 'match_result' AND pl.source_ref->>'phase' = 'ko'))
        AND EXISTS (SELECT 1 FROM active_per_league a WHERE a.user_id = pl.user_id AND a.league_id = l.id)
      ), 0) AS knockout_points
    FROM leagues l
    WHERE l.tier IN ('team-50', 'team-100', 'team-250', 'enterprise')
      AND l.is_public = false
  `);

  const rows = result as unknown as Array<{
    league_id: number;
    league_name: string;
    logo_url: string | null;
    tier: string;
    paid_at: Date | string | null;
    total_members: number;
    active_members: number;
    total_points: number;
    exact_count: number;
    knockout_points: number;
  }>;

  const entries: ChampionRankingEntry[] = rows.map((r) => ({
    leagueId: r.league_id,
    leagueName: r.league_name,
    logoUrl: r.logo_url,
    tier: r.tier,
    totalMembers: r.total_members,
    activeMembers: r.active_members,
    totalPoints: r.total_points,
    avgPoints:
      r.active_members > 0
        ? Math.round((r.total_points / r.active_members) * 100) / 100
        : 0,
    exactScoresCount: r.exact_count,
    knockoutPoints: r.knockout_points,
    paidAt: r.paid_at ? new Date(r.paid_at) : null,
  }));

  // Orden: avg desc → exact-per-member desc → knockout desc → paidAt asc
  // (la liga más antigua gana empate).
  entries.sort((a, b) => {
    if (b.avgPoints !== a.avgPoints) return b.avgPoints - a.avgPoints;
    const aExactAvg = a.activeMembers > 0 ? a.exactScoresCount / a.activeMembers : 0;
    const bExactAvg = b.activeMembers > 0 ? b.exactScoresCount / b.activeMembers : 0;
    if (bExactAvg !== aExactAvg) return bExactAvg - aExactAvg;
    if (b.knockoutPoints !== a.knockoutPoints) return b.knockoutPoints - a.knockoutPoints;
    const aPaid = a.paidAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bPaid = b.paidAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aPaid - bPaid;
  });
  return entries;
}

/**
 * Cuenta cuántos miembros tiene la liga sin traer las filas. Útil para el
 * empty-state de "X jugadores · sin puntos aún" pre-torneo.
 */
export async function countLeagueMembers(leagueId: number): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(leagueMemberships)
    .where(eq(leagueMemberships.leagueId, leagueId));
  return row?.c ?? 0;
}

/**
 * `true` si hay al menos una fila en points_ledger para la liga. Short-circuit
 * barato para saltar el cálculo del ranking pre-torneo cuando nadie tiene
 * puntos todavía.
 */
export async function leagueHasPoints(leagueId: number): Promise<boolean> {
  const rows = await db
    .select({ id: pointsLedger.id })
    .from(pointsLedger)
    .where(eq(pointsLedger.leagueId, leagueId))
    .limit(1);
  return rows.length > 0;
}
