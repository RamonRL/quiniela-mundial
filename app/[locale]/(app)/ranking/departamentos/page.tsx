import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Award, Building2, Crown, Medal } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueDepartments, leagues } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";
import { canUseDepartments } from "@/lib/league-tiers";
import { loadDepartmentRankings, type DepartmentRankingEntry } from "@/lib/leaderboard";
import { RankingTabs } from "../ranking-tabs";

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

  const [depts, rankings] = await Promise.all([
    db
      .select({ c: leagueDepartments.id })
      .from(leagueDepartments)
      .where(eq(leagueDepartments.leagueId, leagueId)),
    loadDepartmentRankings(leagueId),
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

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);
  const allZero = rankings.every((r) => r.avgPoints === 0);

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

      {/* Podio top 3 — patrón visual idéntico al ranking individual */}
      <section className="grid items-end gap-3 sm:grid-cols-3">
        {top3.map((d, i) => {
          const position = (i + 1) as 1 | 2 | 3;
          return <DeptPodiumCard key={d.departmentId} position={position} entry={d} />;
        })}
      </section>

      {/* Resto de departamentos en tabla */}
      {rest.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-px w-6 bg-[var(--color-arena)]" />
            <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {t("positionsRest")}
            </h2>
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="grid grid-cols-[56px_1fr_80px_72px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
              <span>{t("thPos")}</span>
              <span>{t("thDepartment")}</span>
              <span className="text-right">{t("thAvg")}</span>
              <span className="text-right">{t("thActive")}</span>
            </div>
            <ul>
              {rest.map((d, i) => {
                const position = i + 4;
                return (
                  <li
                    key={d.departmentId}
                    className="grid grid-cols-[56px_1fr_80px_72px] items-center gap-2 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0"
                  >
                    <span className="font-display text-2xl tabular text-[var(--color-muted-foreground)]">
                      {position.toString().padStart(2, "0")}
                    </span>
                    <span className="flex items-center gap-2 truncate text-sm font-medium">
                      {d.emoji ? <span>{d.emoji}</span> : null}
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="text-right font-display tabular text-xl">
                      {d.avgPoints}
                    </span>
                    <span className="text-right text-sm tabular text-[var(--color-muted-foreground)]">
                      {d.activeMembers}/{d.totalMembers}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DeptPodiumCard({
  position,
  entry,
}: {
  position: 1 | 2 | 3;
  entry: DepartmentRankingEntry;
}) {
  const t = useTranslations("ranking");
  const layout = {
    1: { order: "sm:order-2", height: "h-48", icon: Crown, labelKey: "gold" },
    2: { order: "sm:order-1", height: "h-40", icon: Medal, labelKey: "silver" },
    3: { order: "sm:order-3", height: "h-36", icon: Award, labelKey: "bronze" },
  }[position];
  const Icon = layout.icon;
  return (
    <div
      className={`relative flex flex-col justify-between gap-3 rounded-xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-4 ${layout.order} ${layout.height}`}
      style={entry.color ? { borderColor: entry.color } : undefined}
    >
      <div className="flex items-center justify-between">
        <Icon className="size-4 text-[var(--color-arena)]" />
        <Badge variant="outline" className="text-[0.55rem]">
          #{position} · {t(layout.labelKey)}
        </Badge>
      </div>
      <div>
        <div className="flex items-center gap-2">
          {entry.emoji ? <span className="text-2xl">{entry.emoji}</span> : null}
          <p className="font-display text-xl leading-tight tracking-tight">{entry.name}</p>
        </div>
        <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
          {t("deptStats", { active: entry.activeMembers, exact: entry.exactScoresCount })}
        </p>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {t("avg")}
        </span>
        <span className="font-display text-3xl tabular">{entry.avgPoints}</span>
      </div>
    </div>
  );
}
