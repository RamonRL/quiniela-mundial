import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, groupStandings, teams } from "@/lib/db/schema";
import { TeamFlag } from "@/components/brand/team-flag";

/**
 * Slider horizontal con la preview de cómo van los 12 grupos: nombre,
 * banderas + código, puntos. Pensado para asomar al dashboard durante el
 * torneo. En móvil se desliza con el dedo (sin scrollbar); en PC aparece
 * una barra horizontal discreta para indicar el desplazamiento — el
 * comportamiento se controla con la utility CSS `.scroll-x-only-on-pc`.
 *
 * Es un Server Component: la query se ejecuta en el server y los datos
 * llegan ya en el HTML inicial; el scroll lo hace el navegador, sin JS.
 */
export async function GroupStandingsSlider() {
  const [allGroups, allTeams, allStandings] = await Promise.all([
    db.select().from(groups).orderBy(asc(groups.code)),
    db.select().from(teams),
    db.select().from(groupStandings),
  ]);

  if (allGroups.length === 0) return null;

  // Indexamos por (groupId, teamId) para mirar el standing de cada equipo
  // en O(1) sin un join SQL más pesado.
  const standingByPair = new Map<string, (typeof allStandings)[number]>();
  for (const s of allStandings) {
    standingByPair.set(`${s.groupId}-${s.teamId}`, s);
  }

  // Para cada grupo, equipos ordenados por posición real si la hay; si
  // ningún equipo del grupo tiene standing aún (pre-torneo), los dejamos
  // por orden alfabético — la card mostrará 0 pts pero igual representa
  // el reparto, lo cual es útil incluso antes del kickoff.
  const cards = allGroups.map((g) => {
    const teamsInGroup = allTeams.filter((t) => t.groupId === g.id);
    const sorted = teamsInGroup.sort((a, b) => {
      const sa = standingByPair.get(`${g.id}-${a.id}`)?.position ?? 99;
      const sb = standingByPair.get(`${g.id}-${b.id}`)?.position ?? 99;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
    return { group: g, teams: sorted };
  });

  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Fase de grupos
          </p>
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            Cómo van los 12 grupos
          </h2>
        </div>
        <Link
          href="/grupos"
          className="hidden items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-arena)] hover:underline sm:inline-flex"
        >
          Ver todos <ArrowRight className="size-3" />
        </Link>
      </header>

      <div
        className="scroll-x-only-on-pc -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 lg:mx-0 lg:px-0"
        aria-label="Preview de los 12 grupos del Mundial 2026"
      >
        {cards.map(({ group, teams: teamsInGroup }) => (
          <article
            key={group.id}
            className="flex w-[15rem] flex-none snap-start flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <header className="flex items-baseline justify-between border-b border-dashed border-[var(--color-border)] pb-2">
              <p className="font-display tabular text-lg tracking-tight">
                Grupo {group.code}
              </p>
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Pts
              </span>
            </header>
            <ul className="mt-2 space-y-1.5">
              {teamsInGroup.map((t) => {
                const s = standingByPair.get(`${group.id}-${t.id}`);
                const advances = (s?.position ?? 99) <= 2;
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <TeamFlag code={t.code} size={20} />
                      <span className="truncate font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-foreground)]">
                        {t.code}
                      </span>
                    </div>
                    <span
                      className={`font-display tabular text-base ${
                        advances && s?.points
                          ? "text-[var(--color-arena)] glow-arena"
                          : ""
                      }`}
                    >
                      {s?.points ?? 0}
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
