import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Sparkles } from "lucide-react";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  leagueDepartments,
  leagueMemberships,
  leagues,
  pointsLedger,
  profiles,
} from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";
import { canUseDepartments } from "@/lib/league-tiers";
import { loadDepartmentRankings } from "@/lib/leaderboard";
import { DepartmentsManager } from "./departments-manager";

export const metadata = { title: "Departamentos" };
export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const me = await requireUser();
  const t = await getTranslations("departments");
  const leagueId = await currentLeagueId(me);
  if (leagueId == null) redirect("/onboarding");

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league || league.isPublic) redirect("/dashboard");
  if (league.createdBy !== me.id) redirect("/mi-quiniela");

  // Basta con que el tier sea premium — no exigimos paidAt para que el
  // admin pueda asignar planes "de cortesía" desde /admin/ligas sin
  // marcar markPaidNow. Si en algún momento el admin quiere quitar la
  // feature a una liga, basta con bajar el tier a "free".
  const hasPaidPlan = canUseDepartments(league.tier);

  if (!hasPaidPlan) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
          <Link href="/mi-quiniela">
            <ArrowLeft />
            {t("backToMyPool")}
          </Link>
        </Button>
        <PageHeader
          eyebrow={t("eyebrowEnterprise")}
          title={t("title")}
          description={t("descLocked")}
        />
        <div className="rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
              <Sparkles className="size-5" />
            </span>
            <div className="min-w-0 space-y-2">
              <h2 className="font-display text-2xl tracking-tight">{t("lockedTitle")}</h2>
              <p className="font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)]">
                {t.rich("lockedBody", {
                  link: (chunks) => (
                    <Link href="/precios" className="text-[var(--color-arena)] underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
              <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                {t.rich("lockedBody2", {
                  b: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Miembros de la liga con su dept actual + fecha de incorporación + puntos.
  const [members, pointsRows, departments, rankings] = await Promise.all([
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
      .where(eq(leagueMemberships.leagueId, league.id))
      .orderBy(asc(profiles.email)),
    db
      .select({
        userId: pointsLedger.userId,
        total: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int`,
      })
      .from(pointsLedger)
      .where(eq(pointsLedger.leagueId, league.id))
      .groupBy(pointsLedger.userId),
    db
      .select()
      .from(leagueDepartments)
      .where(eq(leagueDepartments.leagueId, league.id))
      .orderBy(asc(leagueDepartments.createdAt)),
    loadDepartmentRankings(league.id),
  ]);
  const pointsByUser = new Map(pointsRows.map((r) => [r.userId, r.total]));

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
        <Link href="/mi-quiniela">
          <ArrowLeft />
          {t("backToMyPool")}
        </Link>
      </Button>
      <PageHeader
        eyebrow={league.name}
        title={t("title")}
        description={t("desc")}
      />
      <DepartmentsManager
        leagueId={league.id}
        departments={departments.map((d) => ({
          id: d.id,
          name: d.name,
          emoji: d.emoji,
          color: d.color,
        }))}
        rankings={rankings}
        members={members.map((m) => ({
          userId: m.userId,
          email: m.email,
          nickname: m.nickname,
          avatarUrl: m.avatarUrl,
          departmentId: m.departmentId,
          joinedAt: m.joinedAt.toISOString(),
          points: pointsByUser.get(m.userId) ?? 0,
        }))}
      />
    </div>
  );
}
