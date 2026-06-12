import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { asc, sql } from "drizzle-orm";
import { ChevronRight, Globe, Users } from "lucide-react";
import { db } from "@/lib/db";
import { groups, players, teams } from "@/lib/db/schema";
import { localizeTeams } from "@/lib/team-names";
import { TeamFlag } from "@/components/brand/team-flag";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { BrandCTA } from "@/components/seo/brand-cta";

// Listado de selecciones — el set de equipos cambia rarísimo, cachear 1 h
// es seguro y libera Postgres del tráfico de visitantes/Googlebot.
export const revalidate = 3600;

export const metadata = {
  title: { absolute: "Selecciones del Mundial 2026 — las 48 clasificadas · Quiniela Mundial" },
  description:
    "Las 48 selecciones del Mundial 2026 organizadas por grupo: banderas, cupos y detalle de cada combinado. Primera edición ampliada con CONCACAF, UEFA, CONMEBOL, AFC, CAF y OFC.",
  alternates: { canonical: "/equipos" },
  openGraph: {
    title: "Selecciones del Mundial 2026 · Quiniela Mundial",
    description:
      "Las 48 selecciones del Mundial 2026 — primera edición ampliada con CONCACAF, UEFA, CONMEBOL, AFC, CAF y OFC.",
    url: "/equipos",
  },
};

export default async function TeamsPage() {
  const locale = await getLocale();
  const t = await getTranslations("teamsPage");
  const tt = await getTranslations("tournament");
  const [allGroups, allTeamsRaw, squadCounts] = await Promise.all([
    db.select().from(groups).orderBy(asc(groups.code)),
    db.select().from(teams).orderBy(asc(teams.name)),
    db
      .select({
        teamId: players.teamId,
        count: sql<number>`count(*)::int`,
      })
      .from(players)
      .groupBy(players.teamId),
  ]);
  // Localiza los nombres (EN/FR/PT) tras el fetch — el render de las cards
  // no cambia y el sort por grupo ya reordena por el nombre localizado.
  const allTeams = localizeTeams(allTeamsRaw, locale);
  const teamsByGroup = new Map<number, typeof allTeams>();
  for (const t of allTeams) {
    if (t.groupId == null) continue;
    const arr = teamsByGroup.get(t.groupId) ?? [];
    arr.push(t);
    teamsByGroup.set(t.groupId, arr);
  }
  const totalSquadPlayers = squadCounts.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-10">
      <BreadcrumbLD
        items={[
          { name: tt("home"), href: "/" },
          { name: t("breadcrumb"), href: "/equipos" },
        ]}
      />
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("desc")}
      />

      {totalSquadPlayers > 0 ? (
        <p className="-mt-4 inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
          <Users className="size-3.5 text-[var(--color-arena)]" />
          {t("playersCalledUp", { count: totalSquadPlayers.toLocaleString("es-ES") })}
        </p>
      ) : null}

      {allTeams.length === 0 ? (
        <EmptyState
          icon={<Globe className="size-5" />}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <div className="space-y-10">
          {allGroups.map((g) => {
            const groupTeams = (teamsByGroup.get(g.id) ?? []).sort((a, b) =>
              a.name.localeCompare(b.name),
            );
            if (groupTeams.length === 0) return null;
            return (
              <section key={g.id} className="space-y-3">
                <header className="flex items-baseline gap-3 border-b border-[var(--color-border)] pb-2">
                  <span className="font-display text-3xl tracking-tight text-[var(--color-arena)] glow-arena">
                    {g.code}
                  </span>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                    {tt("groupWithCode", { code: g.code })}
                  </p>
                </header>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {groupTeams.map((t) => (
                    <Link
                      key={t.id}
                      href={`/equipos/${t.code}`}
                      className="group flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-[var(--color-arena)]/40 hover:shadow-[var(--shadow-elev-1)]"
                    >
                      <TeamFlag code={t.code} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg leading-tight tracking-tight">{t.name}</p>
                        <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
                          {t.code}
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-[var(--color-muted-foreground)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <BrandCTA
        brandVariant="bare"
        hint={t("ctaHint")}
      />
    </div>
  );
}
