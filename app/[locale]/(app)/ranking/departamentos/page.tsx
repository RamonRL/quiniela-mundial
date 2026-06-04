import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  leagueDepartments,
  leagueMemberships,
  leagues,
  pointsLedger,
  profiles,
} from "@/lib/db/schema";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";
import { canUseDepartments } from "@/lib/league-tiers";
import { loadDepartmentRankings } from "@/lib/leaderboard";
import {
  buildDeptCards,
  type DeptCardData,
} from "@/app/[locale]/(app)/mi-quiniela/departamentos/dept-data";
import { RankingTabs } from "../ranking-tabs";
import { DeptRankingBoard } from "./dept-ranking-board";

export const metadata = { title: "Ranking · Departamentos" };

export default async function DepartmentsRankingPage() {
  const me = await requireUser();
  const t = await getTranslations("ranking");
  const leagueId = (await currentLeagueId(me))!;

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  // Si la liga es free o pública, no debería haber departamentos. Volver
  // al ranking individual.
  if (!league || league.isPublic || !canUseDepartments(league.tier)) {
    redirect("/ranking");
  }

  const [depts, rankings, members, pointsRows] = await Promise.all([
    db
      .select()
      .from(leagueDepartments)
      .where(eq(leagueDepartments.leagueId, leagueId))
      .orderBy(asc(leagueDepartments.createdAt)),
    loadDepartmentRankings(leagueId),
    db
      .select({
        userId: profiles.id,
        email: profiles.email,
        nickname: profiles.nickname,
        avatarUrl: profiles.avatarUrl,
        departmentId: leagueMemberships.departmentId,
        joinedAt: leagueMemberships.joinedAt,
      })
      .from(leagueMemberships)
      .innerJoin(profiles, eq(profiles.id, leagueMemberships.userId))
      .where(eq(leagueMemberships.leagueId, leagueId)),
    db
      .select({
        userId: pointsLedger.userId,
        total: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int`,
      })
      .from(pointsLedger)
      .where(eq(pointsLedger.leagueId, leagueId))
      .groupBy(pointsLedger.userId),
  ]);

  if (depts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("deptTitle")}
          description={t("deptDescEmpty")}
        />
        <EmptyState
          icon={<Building2 className="size-5" />}
          title={t("deptEmptyTitle")}
          description={t("deptEmptyDesc")}
        />
      </div>
    );
  }

  const pointsByUser = new Map(pointsRows.map((r) => [r.userId, r.total]));
  const cards = buildDeptCards(
    depts,
    rankings,
    members.map((m) => ({
      userId: m.userId,
      email: m.email,
      nickname: m.nickname,
      avatarUrl: m.avatarUrl,
      departmentId: m.departmentId,
      joinedAt: m.joinedAt.toISOString(),
      points: pointsByUser.get(m.userId) ?? 0,
    })),
  );

  // Ordenar las cards según la posición del ranking (media sobre activos).
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const ordered: DeptCardData[] = rankings
    .map((r) => cardById.get(r.departmentId))
    .filter((c): c is DeptCardData => c != null);
  for (const c of cards) if (!ordered.includes(c)) ordered.push(c);

  const allZero = ordered.every((c) => c.avgPoints === 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("deptTitle")}
        description={t("deptDesc")}
      />

      <RankingTabs active="departamentos" />

      {allZero ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/60 px-4 py-3 text-center font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          {t("noResultsYet")}
        </div>
      ) : null}

      <DeptRankingBoard cards={ordered} />
    </div>
  );
}
