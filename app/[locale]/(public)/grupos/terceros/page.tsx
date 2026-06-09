import { TeamFlag } from "@/components/brand/team-flag";
import { getLocale, getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, groupStandings, teams } from "@/lib/db/schema";
import { localizedTeamName } from "@/lib/team-names";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { Trophy } from "lucide-react";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { BrandCTA } from "@/components/seo/brand-cta";
import { computeThirds } from "@/lib/automation/third-place-population";
import { WINNER_TO_R32_MATCH } from "@/lib/bracket/third-place";
import { GroupsTabs } from "../groups-tabs";

// Igual que /grupos: cambia al finalizar partidos. ISR a 60s.
export const revalidate = 60;

export const metadata = {
  title: { absolute: "Mejores terceros del Mundial 2026 · Quiniela Mundial" },
  description:
    "Clasificación en vivo de los 12 terceros de grupo del Mundial 2026 por el criterio FIFA. Los 8 mejores pasan a dieciseisavos y su casilla del R32 según el Anexo C.",
  alternates: { canonical: "/grupos/terceros" },
};

export default async function ThirdPlacePage() {
  const locale = await getLocale();
  const t = await getTranslations("groupsPage");
  const tt = await getTranslations("tournament");

  const [{ thirds, result }, winners] = await Promise.all([
    computeThirds(),
    db
      .select({ group: groups.code, teamCode: teams.code, teamName: teams.name })
      .from(groupStandings)
      .innerJoin(groups, eq(groups.id, groupStandings.groupId))
      .innerJoin(teams, eq(teams.id, groupStandings.teamId))
      .where(eq(groupStandings.position, 1)),
  ]);

  const winnerByGroup = new Map(
    winners.map((w) => [w.group, { code: w.teamCode, name: localizedTeamName(w.teamCode, w.teamName, locale) }]),
  );
  const thirdByGroup = new Map(
    thirds.map((th) => [th.group, { code: th.teamCode, name: localizedTeamName(th.teamCode, th.teamName, locale) }]),
  );

  return (
    <div className="space-y-8">
      <BreadcrumbLD
        items={[
          { name: tt("home"), href: "/" },
          { name: t("breadcrumb"), href: "/grupos" },
          { name: t("thirdsBreadcrumb"), href: "/grupos/terceros" },
        ]}
      />
      <PageHeader eyebrow={t("thirdsEyebrow")} title={t("thirdsTitle")} description={t("thirdsDesc")} />

      <GroupsTabs active="terceros" />

      {thirds.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-5" />}
          title={t("thirdsTitle")}
          description={t("emptyThirds")}
        />
      ) : (
        <div className="space-y-6">
          {/* Ranking de terceros */}
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="grid grid-cols-[28px_1fr_32px_40px_36px_64px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-5 py-2 font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)] sm:grid-cols-[28px_1fr_36px_44px_44px_80px]">
              <span>{t("colRank")}</span>
              <span>{t("colThird")}</span>
              <span className="text-right">{t("colPts")}</span>
              <span className="text-right">{t("colGD")}</span>
              <span className="text-right">{t("colGF")}</span>
              <span className="text-right" />
            </div>
            <ul>
              {result.ranked.map((r) => {
                const team = thirdByGroup.get(r.group);
                return (
                  <li
                    key={r.group}
                    className={`relative grid grid-cols-[28px_1fr_32px_40px_36px_64px] items-center gap-2 border-b border-[var(--color-border)] px-5 py-2.5 last:border-b-0 before:absolute before:inset-y-0 before:left-0 before:w-0.5 sm:grid-cols-[28px_1fr_36px_44px_44px_80px] ${
                      r.qualifies
                        ? "before:bg-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_5%,transparent)]"
                        : "before:bg-transparent opacity-70"
                    }`}
                  >
                    <span className={`font-display tabular text-base ${r.qualifies ? "text-[var(--color-arena)]" : "text-[var(--color-muted-foreground)]"}`}>
                      {r.rank}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <TeamFlag code={team?.code ?? r.group} size={20} />
                      <span className="truncate text-sm font-medium">{team?.name ?? r.group}</span>
                      <span className="font-mono text-[0.55rem] text-[var(--color-muted-foreground)]">{r.group}</span>
                    </span>
                    <span className="text-right font-display tabular text-base">{r.points}</span>
                    <span
                      className={`text-right font-mono text-xs tabular ${
                        r.goalDiff > 0
                          ? "text-[var(--color-success)]"
                          : r.goalDiff < 0
                            ? "text-[var(--color-danger)]"
                            : "text-[var(--color-muted-foreground)]"
                      }`}
                    >
                      {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                    </span>
                    <span className="text-right font-mono text-xs tabular text-[var(--color-muted-foreground)]">
                      {r.goalsFor}
                    </span>
                    <span className="text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.12em] ${
                          r.qualifies
                            ? "bg-[var(--color-arena)]/15 text-[var(--color-arena)]"
                            : "bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
                        }`}
                      >
                        {r.qualifies ? t("statusThrough") : t("statusOut")}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-[var(--color-border)] px-5 py-3 font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              {t("criteriaNote")}
              {result.complete ? "" : ` · ${t("provisional")}`}
            </p>
          </div>

          {/* Cuadro provisional de R32 */}
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <header className="border-b border-[var(--color-border)] px-5 py-3">
              <h2 className="font-display text-lg tracking-tight">{t("allocationTitle")}</h2>
              <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                {t("allocationDesc")}
              </p>
            </header>
            {result.allocation ? (
              <ul className="divide-y divide-[var(--color-border)]">
                {Object.entries(WINNER_TO_R32_MATCH).map(([winner, code]) => {
                  const third = result.allocation![code];
                  const w = winnerByGroup.get(winner);
                  const th = thirdByGroup.get(third);
                  return (
                    <li key={code} className="flex items-center justify-between gap-3 px-5 py-3">
                      <span className="flex min-w-0 items-center gap-2">
                        {w ? <TeamFlag code={w.code} size={18} /> : null}
                        <span className="truncate text-sm font-medium">{w?.name ?? `1${winner}`}</span>
                      </span>
                      <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                        vs
                      </span>
                      <span className="flex min-w-0 items-center justify-end gap-2">
                        <span className="truncate text-right text-sm font-medium">{th?.name ?? `3${third}`}</span>
                        {th ? <TeamFlag code={th.code} size={18} /> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                {t("allocationPending")}
              </p>
            )}
          </div>
        </div>
      )}

      <BrandCTA brandVariant="bare" hint={t("ctaHint")} />
    </div>
  );
}
