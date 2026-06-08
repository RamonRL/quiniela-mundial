import Link from "next/link";
import { ClipboardList, Crown, TrendingUp, Trophy, Users } from "lucide-react";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  leagueMemberships,
  leagues as leaguesTable,
  matches,
  predBracketSlot,
  predGroupRanking,
  predMatchResult,
  predMatchScorer,
  predSpecial,
  predTournamentTopScorer,
  profiles,
  specialPredictions,
} from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/guards";
import { inLeagueFilter } from "@/lib/leagues";
import { cn, initials } from "@/lib/utils";
import { PointsDistributionChart } from "../charts";
import { LeagueProgressSelector } from "./league-progress-selector";

export const metadata = { title: "Producto · Monitoreo" };
export const dynamic = "force-dynamic";

type PredictionsCountsRow = {
  totalUsers: number;
  groupUsers: number;
  bracketUsers: number;
  topScorerUsers: number;
  specialUsers: number;
  matchResultUsers: number;
  matchScorerUsers: number;
};

type LeagueCountsRow = {
  totalLeagues: number;
  publicLeagues: number;
  privateLeagues: number;
};

type TopUserRow = {
  userId: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  points: number;
};

type TopLeagueRow = {
  leagueId: number;
  name: string;
  isPublic: boolean;
  members: number;
};

type BucketRow = { range: string; users: number };

const BUCKET_BOUNDS = [0, 1, 5, 10, 20, 50, 100, 500] as const;

function bucketLabel(min: number, max: number | null) {
  if (max == null) return `${min}+`;
  if (min === max) return `${min}`;
  return `${min}-${max}`;
}

// ───────────────── Configuración por sección de predicciones ─────────────────
//
// Totales fijos de la edición (Grupos = 12; Bracket = R32 16 + R16 8 + QF 4 +
// SF 2 + Final 1 + Tercer puesto 1 = 32; Bota de Oro = 1). Marcadores y
// goleadores se atan al count vivo de `matches`. Especiales al count vivo de
// `special_predictions`. Así el % refleja exactamente lo que el user puede
// llegar a predecir hoy.
const TOTALS_FIXED = {
  groups: 12,
  bracket: 32,
  topScorer: 1,
} as const;

const PREDICTION_SECTIONS = [
  { key: "groups", label: "Grupos" },
  { key: "matchResults", label: "Marcadores" },
  { key: "matchScorers", label: "Goleadores" },
  { key: "bracket", label: "Bracket" },
  { key: "topScorer", label: "Bota" },
  { key: "specials", label: "Especiales" },
] as const;

type SectionKey = (typeof PREDICTION_SECTIONS)[number]["key"];

function pctClass(pct: number): string {
  if (pct >= 90) return "text-[var(--color-success)] font-semibold";
  if (pct >= 50) return "text-[var(--color-arena)]";
  if (pct > 0) return "text-[var(--color-foreground)]";
  return "text-[var(--color-muted-foreground)]/50";
}

export default async function MonitoringProductoPage({
  searchParams,
}: {
  searchParams?: Promise<{ league?: string }>;
}) {
  await requireAdmin();
  const params = (await searchParams) ?? {};
  const leagueParam = params.league ? Number(params.league) : NaN;
  const explicitLeagueId =
    Number.isFinite(leagueParam) && leagueParam > 0 ? leagueParam : null;

  // Cumplimiento por categoría: cuántos usuarios distintos tienen al menos
  // una predicción de cada tipo, vs total de usuarios.
  // Excluimos usuarios de relleno (@demo.invalid) de los KPIs globales:
  // total y "usuarios distintos que han predicho X" (vía JOIN a profiles).
  const [predRow] = await db.execute<PredictionsCountsRow>(sql`
    SELECT
      (SELECT count(*)::int FROM profiles WHERE email NOT LIKE '%@demo.invalid')                                                                              AS "totalUsers",
      (SELECT count(DISTINCT x.user_id)::int FROM pred_group_ranking x JOIN profiles p ON p.id = x.user_id WHERE p.email NOT LIKE '%@demo.invalid')            AS "groupUsers",
      (SELECT count(DISTINCT x.user_id)::int FROM pred_bracket_slot x JOIN profiles p ON p.id = x.user_id WHERE p.email NOT LIKE '%@demo.invalid')             AS "bracketUsers",
      (SELECT count(DISTINCT x.user_id)::int FROM pred_tournament_top_scorer x JOIN profiles p ON p.id = x.user_id WHERE p.email NOT LIKE '%@demo.invalid')    AS "topScorerUsers",
      (SELECT count(DISTINCT x.user_id)::int FROM pred_special x JOIN profiles p ON p.id = x.user_id WHERE p.email NOT LIKE '%@demo.invalid')                  AS "specialUsers",
      (SELECT count(DISTINCT x.user_id)::int FROM pred_match_result x JOIN profiles p ON p.id = x.user_id WHERE p.email NOT LIKE '%@demo.invalid')             AS "matchResultUsers",
      (SELECT count(DISTINCT x.user_id)::int FROM pred_match_scorer x JOIN profiles p ON p.id = x.user_id WHERE p.email NOT LIKE '%@demo.invalid')             AS "matchScorerUsers"
  `);
  const preds = predRow as PredictionsCountsRow;

  const [leagueRow] = await db.execute<LeagueCountsRow>(sql`
    SELECT
      (SELECT count(*)::int FROM leagues)                              AS "totalLeagues",
      (SELECT count(*) FILTER (WHERE is_public)::int FROM leagues)     AS "publicLeagues",
      (SELECT count(*) FILTER (WHERE NOT is_public)::int FROM leagues) AS "privateLeagues"
  `);
  const leagues = leagueRow as LeagueCountsRow;

  // Top 10 usuarios por puntos (sumando points_ledger por usuario).
  const topUsers = (await db.execute<TopUserRow>(sql`
    SELECT
      p.id                AS "userId",
      p.email             AS email,
      p.nickname          AS nickname,
      p.avatar_url        AS "avatarUrl",
      COALESCE(SUM(pl.points), 0)::int AS points
    FROM profiles p
    LEFT JOIN points_ledger pl ON pl.user_id = p.id
    WHERE p.email NOT LIKE '%@demo.invalid'
    GROUP BY p.id
    ORDER BY points DESC, p.created_at ASC
    LIMIT 10
  `)) as TopUserRow[];

  // Top 10 ligas privadas por miembros.
  const topLeagues = (await db.execute<TopLeagueRow>(sql`
    SELECT
      l.id                 AS "leagueId",
      l.name               AS name,
      l.is_public          AS "isPublic",
      count(p.id)::int     AS members
    FROM leagues l
    LEFT JOIN league_memberships lm ON lm.league_id = l.id
    LEFT JOIN profiles p ON p.id = lm.user_id AND p.email NOT LIKE '%@demo.invalid'
    GROUP BY l.id
    ORDER BY members DESC, l.created_at ASC
    LIMIT 10
  `)) as TopLeagueRow[];

  // Buckets de distribución de puntos por usuario.
  const bucketRowsRaw = await db.execute<{ userPoints: number }>(sql`
    SELECT COALESCE(SUM(pl.points), 0)::int AS "userPoints"
    FROM points_ledger pl
    JOIN profiles p ON p.id = pl.user_id
    WHERE p.email NOT LIKE '%@demo.invalid'
    GROUP BY pl.user_id
  `);
  const bucketRows = bucketRowsRaw as { userPoints: number }[];
  // Incluimos a usuarios SIN entries en points_ledger (entran con 0 puntos).
  const usersWithoutLedger = Math.max(0, preds.totalUsers - bucketRows.length);
  const bucketCounts = new Map<string, number>();
  const pushBucket = (label: string) => {
    bucketCounts.set(label, (bucketCounts.get(label) ?? 0) + 1);
  };
  for (let i = 0; i < usersWithoutLedger; i++) pushBucket("0");
  for (const r of bucketRows) {
    const pts = Number(r.userPoints);
    let placed = false;
    for (let j = 0; j < BUCKET_BOUNDS.length; j++) {
      const lo = BUCKET_BOUNDS[j];
      const hi = (BUCKET_BOUNDS[j + 1] ?? null) as number | null;
      if (hi == null) {
        pushBucket(bucketLabel(lo, null));
        placed = true;
        break;
      }
      if (pts >= lo && pts < hi) {
        pushBucket(bucketLabel(lo, hi - 1));
        placed = true;
        break;
      }
    }
    if (!placed) pushBucket(`${pts}`);
  }
  const buckets: BucketRow[] = BUCKET_BOUNDS.map((lo, j) => {
    const hi = (BUCKET_BOUNDS[j + 1] ?? null) as number | null;
    const label = bucketLabel(lo, hi == null ? null : hi - 1);
    return { range: label, users: bucketCounts.get(label) ?? 0 };
  });

  const categories = [
    { key: "Grupos", count: preds.groupUsers },
    { key: "Bracket", count: preds.bracketUsers },
    { key: "Pichichi", count: preds.topScorerUsers },
    { key: "Especiales", count: preds.specialUsers },
    { key: "Resultados", count: preds.matchResultUsers },
    { key: "Goleadores", count: preds.matchScorerUsers },
  ];

  // ───────────────── Predicciones por liga (sección "Predicciones por liga") ─────────────────
  //
  // Cargamos TODAS las ligas para el selector (con conteo de miembros) y, si
  // hay una seleccionada en `?league=`, los datos detallados para la tabla.
  // Si no hay seleccionada, pre-elegimos la primera disponible para que la
  // sección siempre muestre algo útil al aterrizar en /producto.
  const leagueOptions = await db
    .select({
      id: leaguesTable.id,
      name: leaguesTable.name,
      isPublic: leaguesTable.isPublic,
      members: sql<number>`count(${leagueMemberships.userId})::int`,
    })
    .from(leaguesTable)
    .leftJoin(leagueMemberships, eq(leagueMemberships.leagueId, leaguesTable.id))
    .groupBy(leaguesTable.id, leaguesTable.name, leaguesTable.isPublic, leaguesTable.createdAt)
    .orderBy(asc(leaguesTable.isPublic), asc(leaguesTable.createdAt));

  // is_public ASC: la pública (false<true? en Postgres false<true) salimos por
  // booleano; en realidad queremos la pública PRIMERO. Postgres ordena false<true,
  // así que las privadas (isPublic=false) saldrían antes. Reordenamos en JS para
  // poner la pública arriba — más natural para el admin que la quiere mirar.
  leagueOptions.sort((a, b) => {
    if (a.isPublic !== b.isPublic) return a.isPublic ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const effectiveLeagueId = explicitLeagueId ?? leagueOptions[0]?.id ?? null;
  const selectedLeague = effectiveLeagueId
    ? leagueOptions.find((l) => l.id === effectiveLeagueId) ?? null
    : null;

  type UserProgress = {
    userId: string;
    email: string;
    nickname: string | null;
    avatarUrl: string | null;
    made: Record<SectionKey, number>;
    totals: Record<SectionKey, number>;
    totalMade: number;
    totalAll: number;
    globalPct: number;
  };

  let userProgress: UserProgress[] = [];
  let sectionTotals: Record<SectionKey, number> | null = null;

  if (effectiveLeagueId) {
    const memberFilter = inLeagueFilter(effectiveLeagueId);
    if (memberFilter) {
      const [[{ c: matchesTotal }], [{ c: specialsTotal }], members] = await Promise.all([
        db.select({ c: sql<number>`count(*)::int` }).from(matches),
        db.select({ c: sql<number>`count(*)::int` }).from(specialPredictions),
        db
          .select({
            id: profiles.id,
            email: profiles.email,
            nickname: profiles.nickname,
            avatarUrl: profiles.avatarUrl,
          })
          .from(profiles)
          .where(memberFilter),
      ]);

      sectionTotals = {
        groups: TOTALS_FIXED.groups,
        matchResults: matchesTotal,
        matchScorers: matchesTotal,
        bracket: TOTALS_FIXED.bracket,
        topScorer: TOTALS_FIXED.topScorer,
        specials: specialsTotal,
      };

      // Seis GROUP BY userId, uno por categoría, scoped a esta liga. En
      // paralelo. Para una liga grande (1000+ users) cada uno son < 20ms.
      const [
        groupRows,
        matchResRows,
        matchScrRows,
        bracketRows,
        topScrRows,
        specialRows,
      ] = await Promise.all([
        db
          .select({ userId: predGroupRanking.userId, c: sql<number>`count(*)::int` })
          .from(predGroupRanking)
          .where(eq(predGroupRanking.leagueId, effectiveLeagueId))
          .groupBy(predGroupRanking.userId),
        db
          .select({ userId: predMatchResult.userId, c: sql<number>`count(*)::int` })
          .from(predMatchResult)
          .where(eq(predMatchResult.leagueId, effectiveLeagueId))
          .groupBy(predMatchResult.userId),
        db
          .select({ userId: predMatchScorer.userId, c: sql<number>`count(*)::int` })
          .from(predMatchScorer)
          .where(eq(predMatchScorer.leagueId, effectiveLeagueId))
          .groupBy(predMatchScorer.userId),
        db
          .select({ userId: predBracketSlot.userId, c: sql<number>`count(*)::int` })
          .from(predBracketSlot)
          .where(eq(predBracketSlot.leagueId, effectiveLeagueId))
          .groupBy(predBracketSlot.userId),
        db
          .select({ userId: predTournamentTopScorer.userId, c: sql<number>`count(*)::int` })
          .from(predTournamentTopScorer)
          .where(eq(predTournamentTopScorer.leagueId, effectiveLeagueId))
          .groupBy(predTournamentTopScorer.userId),
        db
          .select({ userId: predSpecial.userId, c: sql<number>`count(*)::int` })
          .from(predSpecial)
          .where(eq(predSpecial.leagueId, effectiveLeagueId))
          .groupBy(predSpecial.userId),
      ]);

      const idx = (rows: { userId: string; c: number }[]) =>
        new Map(rows.map((r) => [r.userId, r.c]));
      const ix = {
        groups: idx(groupRows),
        matchResults: idx(matchResRows),
        matchScorers: idx(matchScrRows),
        bracket: idx(bracketRows),
        topScorer: idx(topScrRows),
        specials: idx(specialRows),
      } as const;

      const totalAll =
        sectionTotals.groups +
        sectionTotals.matchResults +
        sectionTotals.matchScorers +
        sectionTotals.bracket +
        sectionTotals.topScorer +
        sectionTotals.specials;

      userProgress = members.map((m) => {
        const made: Record<SectionKey, number> = {
          groups: ix.groups.get(m.id) ?? 0,
          matchResults: ix.matchResults.get(m.id) ?? 0,
          matchScorers: ix.matchScorers.get(m.id) ?? 0,
          bracket: ix.bracket.get(m.id) ?? 0,
          topScorer: ix.topScorer.get(m.id) ?? 0,
          specials: ix.specials.get(m.id) ?? 0,
        };
        const totalMade =
          made.groups +
          made.matchResults +
          made.matchScorers +
          made.bracket +
          made.topScorer +
          made.specials;
        return {
          userId: m.id,
          email: m.email,
          nickname: m.nickname,
          avatarUrl: m.avatarUrl,
          made,
          totals: sectionTotals!,
          totalMade,
          totalAll,
          globalPct: totalAll > 0 ? (totalMade / totalAll) * 100 : 0,
        };
      });

      userProgress.sort((a, b) => {
        if (a.globalPct !== b.globalPct) return b.globalPct - a.globalPct;
        return (a.nickname ?? a.email).localeCompare(b.nickname ?? b.email);
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* ───────── Cumplimiento de predicciones ───────── */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <header className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
            <TrendingUp className="size-4" />
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em]">
              Cumplimiento · usuarios con al menos 1 predicción
            </p>
          </div>
          <Badge variant="outline" className="text-[0.55rem]">
            {preds.totalUsers} usuarios totales
          </Badge>
        </header>
        <ul className="space-y-2">
          {categories.map((c) => {
            const pct = preds.totalUsers > 0 ? (c.count / preds.totalUsers) * 100 : 0;
            return (
              <li
                key={c.key}
                className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2"
              >
                <span className="w-28 shrink-0 font-display text-sm tracking-tight">{c.key}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-arena)]"
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right font-mono text-xs tabular text-[var(--color-muted-foreground)]">
                  {c.count} · {pct.toFixed(0)}%
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ───────── Predicciones por liga ─────────
          Selector + tabla con el % completado por usuario, ordenada
          desc. Cubre tanto la pública como las privadas para que el
          admin pueda decidir si la pública aporta o si conviene
          desactivarla. */}
      <section
        id="predicciones-por-liga"
        className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
          <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
            <ClipboardList className="size-4" />
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em]">
              Predicciones por liga · % completado por usuario
            </p>
          </div>
          <LeagueProgressSelector
            leagues={leagueOptions}
            currentLeagueId={effectiveLeagueId}
          />
        </header>

        {!selectedLeague || sectionTotals == null ? (
          <div className="p-8 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Elige una liga arriba para ver el detalle por usuario.
          </div>
        ) : userProgress.length === 0 ? (
          <div className="p-8 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            La liga{" "}
            <strong className="not-italic font-semibold text-[var(--color-foreground)]">
              {selectedLeague.name}
            </strong>{" "}
            no tiene miembros.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-[var(--color-border)] px-4 py-3">
              <p className="font-display text-base tracking-tight">
                {selectedLeague.name}
                <span className="ml-2 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                  {selectedLeague.isPublic ? "pública" : "privada"} · {selectedLeague.members} miembros
                </span>
              </p>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Total predecible: {sectionTotals.groups + sectionTotals.matchResults + sectionTotals.matchScorers + sectionTotals.bracket + sectionTotals.topScorer + sectionTotals.specials} picks
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="w-44 text-right">Global</TableHead>
                    {PREDICTION_SECTIONS.map((s) => (
                      <TableHead
                        key={s.key}
                        className="w-24 text-right"
                        title={`${sectionTotals![s.key as SectionKey]} predicciones posibles`}
                      >
                        {s.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userProgress.map((row) => {
                    const display = row.nickname || row.email.split("@")[0];
                    return (
                      <TableRow key={row.userId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 border border-[var(--color-border)]">
                              {row.avatarUrl ? (
                                <AvatarImage src={row.avatarUrl} alt="" />
                              ) : null}
                              <AvatarFallback className="text-[0.6rem]">
                                {initials(display)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{display}</p>
                              <p className="truncate font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                                {row.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-middle">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                              <div
                                className="h-full rounded-full bg-[var(--color-arena)]"
                                style={{ width: `${Math.max(row.globalPct > 0 ? 2 : 0, row.globalPct)}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                "w-10 text-right font-display tabular text-base",
                                pctClass(row.globalPct),
                              )}
                            >
                              {row.globalPct.toFixed(0)}%
                            </span>
                          </div>
                          <p className="font-mono text-[0.55rem] tabular text-[var(--color-muted-foreground)]">
                            {row.totalMade}/{row.totalAll}
                          </p>
                        </TableCell>
                        {PREDICTION_SECTIONS.map((s) => {
                          const made = row.made[s.key as SectionKey];
                          const total = sectionTotals![s.key as SectionKey];
                          const pct = total > 0 ? (made / total) * 100 : 0;
                          return (
                            <TableCell
                              key={s.key}
                              className={cn(
                                "text-right font-mono text-xs tabular",
                                pctClass(pct),
                              )}
                              title={`${made}/${total}`}
                            >
                              {total === 0 ? "—" : `${pct.toFixed(0)}%`}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      {/* ───────── Distribución de puntos ───────── */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <header className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
            <Trophy className="size-4" />
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em]">
              Distribución de puntos · usuarios por bucket
            </p>
          </div>
        </header>
        <PointsDistributionChart data={buckets} />
      </section>

      {/* ───────── Top usuarios ───────── */}
      <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
          <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
            <Crown className="size-4 text-[var(--color-arena)]" />
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em]">Top 10 usuarios</p>
          </div>
          <Link
            href="/ranking"
            className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)] hover:underline"
          >
            Ver ranking completo →
          </Link>
        </header>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead className="text-right">Puntos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topUsers.map((u, i) => {
              const display = u.nickname || u.email.split("@")[0];
              const pos = i + 1;
              const isTop = pos === 1;
              return (
                <TableRow key={u.userId}>
                  <TableCell
                    className={`font-display tabular text-base ${
                      isTop ? "text-[var(--color-arena)] glow-arena" : "text-[var(--color-muted-foreground)]"
                    }`}
                  >
                    {pos.toString().padStart(2, "0")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7 border border-[var(--color-border)]">
                        {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="text-[0.55rem]">
                          {initials(display)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{display}</span>
                    </div>
                  </TableCell>
                  <TableCell
                    className={`text-right font-display tabular text-lg ${
                      isTop ? "text-[var(--color-arena)] glow-arena" : ""
                    }`}
                  >
                    {u.points}
                  </TableCell>
                </TableRow>
              );
            })}
            {topUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-8 text-center text-sm text-[var(--color-muted-foreground)]"
                >
                  Sin puntos registrados todavía.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>

      {/* ───────── Ligas ───────── */}
      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Ligas totales" value={leagues.totalLeagues} />
        <StatTile label="Públicas" value={leagues.publicLeagues} />
        <StatTile label="Privadas" value={leagues.privateLeagues} />
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <header className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-[var(--color-muted-foreground)]">
          <Users className="size-4" />
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em]">
            Top 10 ligas por miembros
          </p>
        </header>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Liga</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Miembros</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topLeagues.map((l, i) => (
              <TableRow key={l.leagueId}>
                <TableCell className="text-xs text-[var(--color-muted-foreground)]">
                  {(i + 1).toString().padStart(2, "0")}
                </TableCell>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell>
                  <Badge variant={l.isPublic ? "default" : "outline"} className="text-[0.55rem]">
                    {l.isPublic ? "Pública" : "Privada"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-display tabular text-lg">
                  {l.members}
                </TableCell>
              </TableRow>
            ))}
            {topLeagues.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-[var(--color-muted-foreground)]"
                >
                  Sin ligas todavía.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 font-display tabular text-3xl tracking-tight">{value}</p>
    </div>
  );
}
