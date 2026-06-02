import { TeamFlag } from "@/components/brand/team-flag";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, groupStandings, teams } from "@/lib/db/schema";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { ArrowUpRight, Users } from "lucide-react";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { BrandCTA } from "@/components/seo/brand-cta";

// Clasificación de grupos: cambia cuando finaliza un partido. ISR a 60s
// la mantiene fresca sin pegar a Postgres en cada navegación.
export const revalidate = 60;

export const metadata = {
  title: { absolute: "Grupos del Mundial 2026 — las 48 selecciones · Quiniela Mundial" },
  description:
    "Los 12 grupos del Mundial 2026 con las 48 selecciones clasificadas. Top 2 + los 8 mejores terceros pasan a la fase de R32.",
  alternates: { canonical: "/grupos" },
  openGraph: {
    title: "Grupos del Mundial 2026 · Quiniela Mundial",
    description: "Las 48 selecciones del Mundial 2026 distribuidas en 12 grupos.",
    url: "/grupos",
  },
};

export default async function GroupsPage() {
  const [allGroups, allTeams, standings] = await Promise.all([
    db.select().from(groups).orderBy(asc(groups.code)),
    db.select().from(teams).orderBy(asc(teams.name)),
    db.select().from(groupStandings),
  ]);
  const teamsByGroup = new Map<number, typeof allTeams>();
  for (const t of allTeams) {
    if (t.groupId) {
      const arr = teamsByGroup.get(t.groupId) ?? [];
      arr.push(t);
      teamsByGroup.set(t.groupId, arr);
    }
  }
  const standingByPair = new Map<string, (typeof standings)[number]>();
  for (const s of standings) {
    standingByPair.set(`${s.groupId}-${s.teamId}`, s);
  }

  return (
    <div className="space-y-8">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Grupos", href: "/grupos" },
        ]}
      />
      <PageHeader
        eyebrow="Fase de grupos"
        title="Los 12 grupos del Mundial 2026"
        description="Las 48 selecciones del Mundial 2026 repartidas en 12 grupos de 4. Top 2 + los 8 mejores terceros pasan a R32 (dieciseisavos)."
      />
      {allGroups.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="Sin grupos"
          description="Aún sin asignar."
        />
      ) : (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          {allGroups.map((g) => {
            const groupTeams = teamsByGroup.get(g.id) ?? [];
            const sorted = [...groupTeams].sort((a, b) => {
              const sa = standingByPair.get(`${g.id}-${a.id}`)?.position ?? 99;
              const sb = standingByPair.get(`${g.id}-${b.id}`)?.position ?? 99;
              return sa - sb;
            });
            const totalPlayed = sorted.reduce(
              (acc, t) => acc + (standingByPair.get(`${g.id}-${t.id}`)?.played ?? 0),
              0,
            );
            // Cada grupo tiene 6 partidos (4 selecciones, todos contra todos).
            // El total de "played" suma 2 por cada partido (cuenta a los dos
            // bandos), así que played/2 da los partidos disputados.
            const matchesPlayed = Math.floor(totalPlayed / 2);
            return (
              <Link
                key={g.id}
                href={`/grupos/${g.code}`}
                className="group relative block overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-arena)]/50 hover:shadow-[var(--shadow-elev-2)]"
              >
                {/* Halftone sutil sobre la letra del grupo */}
                <div
                  aria-hidden
                  className="halftone pointer-events-none absolute inset-x-0 top-0 h-32 opacity-[0.05]"
                />

                {/* Header — letra del grupo dominante */}
                <header className="relative flex items-end justify-between gap-3 border-b border-[var(--color-border)] px-5 pb-4 pt-5">
                  <div>
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                      Grupo
                    </p>
                    <h2 className="font-display text-7xl leading-none tracking-tight text-[var(--color-arena)] glow-arena sm:text-8xl">
                      {g.code}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end gap-2 pb-1">
                    {matchesPlayed > 0 ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        <span className="font-display tabular text-base text-[var(--color-foreground)]">
                          {matchesPlayed}
                        </span>
                        / 6 jugados
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        Sin jugar
                      </span>
                    )}
                    <ArrowUpRight className="size-4 text-[var(--color-muted-foreground)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-arena)]" />
                  </div>
                </header>

                <StandingsHeader />
                {sorted.length === 0 ? (
                  <p className="py-6 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                    Selecciones aún sin asignar.
                  </p>
                ) : (
                  <ul>
                    {sorted.map((t, i) => {
                      const s = standingByPair.get(`${g.id}-${t.id}`);
                      const pos = i + 1;
                      return (
                        <StandingRow
                          key={t.id}
                          pos={pos}
                          team={t}
                          played={s?.played ?? 0}
                          won={s?.won ?? 0}
                          drawn={s?.drawn ?? 0}
                          lost={s?.lost ?? 0}
                          goalsFor={s?.goalsFor ?? 0}
                          goalsAgainst={s?.goalsAgainst ?? 0}
                          points={s?.points ?? 0}
                        />
                      );
                    })}
                  </ul>
                )}

              </Link>
            );
          })}
        </div>
      )}

      <BrandCTA
        brandVariant="bare"
        hint="Predice las 4 posiciones de cada grupo antes de que arranque el torneo el 11 de junio."
      />
    </div>
  );
}

function StandingsHeader() {
  return (
    <>
      {/* Mobile header: # · Selección · PJ · DG · Pts */}
      <div className="grid grid-cols-[24px_1fr_28px_36px_44px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-5 py-2 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] sm:hidden">
        <span>#</span>
        <span>Selección</span>
        <span className="text-right">PJ</span>
        <span className="text-right">DG</span>
        <span className="text-right">Pts</span>
      </div>
      {/* Desktop header: full table */}
      <div className="hidden grid-cols-[24px_1fr_28px_28px_28px_28px_36px_36px_44px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-5 py-2 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] sm:grid">
        <span>#</span>
        <span>Selección</span>
        <span className="text-right">PJ</span>
        <span className="text-right">G</span>
        <span className="text-right">E</span>
        <span className="text-right">P</span>
        <span className="text-right">GF</span>
        <span className="text-right">GC</span>
        <span className="text-right">Pts</span>
      </div>
    </>
  );
}

type StandingRowProps = {
  pos: number;
  team: { id: number; code: string; name: string };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

function StandingRow({
  pos,
  team,
  played,
  won,
  drawn,
  lost,
  goalsFor,
  goalsAgainst,
  points,
}: StandingRowProps) {
  const advances = pos <= 2;
  const limbo = pos === 3;
  const goalDiff = goalsFor - goalsAgainst;
  // Banda lateral izquierda con color de clasificación. Top 2 arena fuerte,
  // 3º amber/warning sutil, 4º sin acento.
  const stripe = advances
    ? "before:bg-[var(--color-arena)]"
    : limbo
      ? "before:bg-[var(--color-warning)]/70"
      : "before:bg-transparent";
  const posColor = advances
    ? "text-[var(--color-arena)]"
    : limbo
      ? "text-[var(--color-warning)]"
      : "text-[var(--color-muted-foreground)]";
  // Fondo sutil por estado.
  const rowBg = advances
    ? "bg-[color-mix(in_oklch,var(--color-arena)_5%,transparent)]"
    : limbo
      ? "bg-[color-mix(in_oklch,var(--color-warning)_4%,transparent)]"
      : "";

  return (
    <li
      className={`relative border-b border-[var(--color-border)] last:border-b-0 before:absolute before:inset-y-0 before:left-0 before:w-0.5 ${stripe} ${rowBg}`}
    >
      {/* Mobile row */}
      <div className="grid grid-cols-[24px_1fr_28px_36px_44px] items-center gap-2 px-5 py-2.5 sm:hidden">
        <span className={`font-display tabular text-base ${posColor}`}>{pos}</span>
        <span className="flex min-w-0 items-center gap-2">
          <TeamFlag code={team.code} size={20} />
          <span className="truncate text-sm font-medium">{team.name}</span>
        </span>
        <span className="text-right font-mono text-xs tabular text-[var(--color-muted-foreground)]">
          {played}
        </span>
        <span
          className={`text-right font-mono text-xs tabular ${
            goalDiff > 0
              ? "text-[var(--color-success)]"
              : goalDiff < 0
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-muted-foreground)]"
          }`}
        >
          {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
        </span>
        <span
          className={`text-right font-display tabular text-lg ${
            advances ? "text-[var(--color-arena)] glow-arena" : ""
          }`}
        >
          {points}
        </span>
      </div>
      {/* Desktop row */}
      <div className="hidden grid-cols-[24px_1fr_28px_28px_28px_28px_36px_36px_44px] items-center gap-2 px-5 py-2.5 sm:grid">
        <span className={`font-display tabular text-base ${posColor}`}>{pos}</span>
        <span className="flex min-w-0 items-center gap-2">
          <TeamFlag code={team.code} size={20} />
          <span className="truncate text-sm font-medium">{team.name}</span>
        </span>
        <span className="text-right font-mono text-xs tabular text-[var(--color-muted-foreground)]">
          {played}
        </span>
        <span className="text-right font-mono text-xs tabular text-[var(--color-muted-foreground)]">
          {won}
        </span>
        <span className="text-right font-mono text-xs tabular text-[var(--color-muted-foreground)]">
          {drawn}
        </span>
        <span className="text-right font-mono text-xs tabular text-[var(--color-muted-foreground)]">
          {lost}
        </span>
        <span className="text-right font-mono text-xs tabular text-[var(--color-muted-foreground)]">
          {goalsFor}
        </span>
        <span className="text-right font-mono text-xs tabular text-[var(--color-muted-foreground)]">
          {goalsAgainst}
        </span>
        <span
          className={`text-right font-display tabular text-lg ${
            advances ? "text-[var(--color-arena)] glow-arena" : ""
          }`}
        >
          {points}
        </span>
      </div>
    </li>
  );
}
