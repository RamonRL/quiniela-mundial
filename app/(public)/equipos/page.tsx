import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { ChevronRight, Globe, Users } from "lucide-react";
import { db } from "@/lib/db";
import { groups, players, teams } from "@/lib/db/schema";
import { TeamFlag } from "@/components/brand/team-flag";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { BreadcrumbLD } from "@/components/seo/jsonld";

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
  const [allGroups, allTeams, squadCounts] = await Promise.all([
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
  const teamsByGroup = new Map<number, typeof allTeams>();
  for (const t of allTeams) {
    if (t.groupId == null) continue;
    const arr = teamsByGroup.get(t.groupId) ?? [];
    arr.push(t);
    teamsByGroup.set(t.groupId, arr);
  }
  const squadByTeam = new Map(squadCounts.map((r) => [r.teamId, r.count]));
  const totalSquadPlayers = squadCounts.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-10">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Selecciones", href: "/equipos" },
        ]}
      />
      <PageHeader
        eyebrow="Mundial 2026"
        title="Las 48 selecciones del Mundial 2026"
        description="Primera edición ampliada del Mundial. 48 selecciones repartidas en 12 grupos, con representantes de las 6 confederaciones."
      />

      {totalSquadPlayers > 0 ? (
        <p className="-mt-4 inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
          <Users className="size-3.5 text-[var(--color-arena)]" />
          {totalSquadPlayers.toLocaleString("es-ES")} jugadores convocados
        </p>
      ) : null}

      {allTeams.length === 0 ? (
        <EmptyState
          icon={<Globe className="size-5" />}
          title="Selecciones aún sin cargar"
          description="Pendiente."
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
                    Grupo {g.code}
                  </p>
                </header>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {groupTeams.map((t) => {
                    const squadSize = squadByTeam.get(t.id) ?? 0;
                    return (
                      <Link
                        key={t.id}
                        href={`/equipos/${t.code}`}
                        className="group flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-[var(--color-arena)]/40 hover:shadow-[var(--shadow-elev-1)]"
                      >
                        <TeamFlag code={t.code} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.name}</p>
                          <p className="flex items-center gap-2 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
                            <span>{t.code}</span>
                            {squadSize > 0 ? (
                              <>
                                <span aria-hidden className="size-1 rounded-full bg-[var(--color-border-strong)]" />
                                <span className="inline-flex items-center gap-1 text-[var(--color-arena)]">
                                  <Users className="size-3" />
                                  {squadSize}
                                </span>
                              </>
                            ) : null}
                          </p>
                        </div>
                        <ChevronRight className="size-4 text-[var(--color-muted-foreground)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
