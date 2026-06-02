import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchScorers, matches, teams } from "@/lib/db/schema";
import { TeamFlag } from "@/components/brand/team-flag";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { BarChart3, Shield, Target } from "lucide-react";
import { formatRemaining } from "@/lib/deadlines";

export const metadata = { title: "Estadísticas" };

const KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

const STAGE_LABEL: Record<string, string> = {
  group: "Fase de grupos",
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinales",
  third: "Tercer puesto",
  final: "Final",
};

export default async function StatsPage() {
  const [matchAgg] = await db
    .select({
      played: sql<number>`count(*) filter (where status = 'finished')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(matches);

  if (matchAgg.played === 0) {
    const ms = Math.max(0, KICKOFF.getTime() - Date.now());
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Datos del torneo"
          title="Estadísticas"
          description="El pulso del torneo."
        />
        <EmptyState
          icon={<BarChart3 className="size-5" />}
          title="Sin datos todavía"
          description={`Aparecerán aquí cuando se juegue el primer partido. El torneo arranca en ${formatRemaining(ms)}.`}
        />
      </div>
    );
  }

  // Una sola pasada: para cada equipo, sumamos goles a favor / en contra y
  // partidos jugados (filas home + away) directamente en SQL. Antes traíamos
  // todos los partidos terminados a memoria y los recorríamos en JS dos veces
  // por equipo.
  const [
    scorerRows,
    drawsRows,
    teamStatsRows,
    stagesAgg,
  ] = await Promise.all([
    db.select({ goals: sql<number>`count(*)::int` }).from(matchScorers),
    db
      .select({
        draws: sql<number>`count(*) filter (where home_score = away_score and status = 'finished')::int`,
        penalties: sql<number>`count(*) filter (where went_to_pens)::int`,
        over6: sql<number>`count(*) filter (where home_score + away_score > 6)::int`,
      })
      .from(matches),
    db.execute<{
      team_id: number;
      code: string;
      name: string;
      scored: number;
      conceded: number;
      played: number;
    }>(sql`
      WITH per_match AS (
        SELECT home_team_id AS team_id, home_score AS scored, away_score AS conceded
          FROM matches WHERE status = 'finished' AND home_team_id IS NOT NULL
        UNION ALL
        SELECT away_team_id AS team_id, away_score AS scored, home_score AS conceded
          FROM matches WHERE status = 'finished' AND away_team_id IS NOT NULL
      )
      SELECT
        t.id AS team_id,
        t.code,
        t.name,
        coalesce(sum(pm.scored), 0)::int AS scored,
        coalesce(sum(pm.conceded), 0)::int AS conceded,
        count(pm.team_id)::int AS played
      FROM teams t
      JOIN per_match pm ON pm.team_id = t.id
      GROUP BY t.id, t.code, t.name
      HAVING count(pm.team_id) > 0
    `),
    db
      .select({
        stage: matches.stage,
        played: sql<number>`count(*) filter (where status = 'finished')::int`,
        goals: sql<number>`coalesce(sum(home_score) filter (where status = 'finished'), 0)::int + coalesce(sum(away_score) filter (where status = 'finished'), 0)::int`,
      })
      .from(matches)
      .groupBy(matches.stage),
  ]);
  const scorerCount = scorerRows[0] ?? { goals: 0 };
  const drawsRow = drawsRows[0] ?? { draws: 0, penalties: 0, over6: 0 };

  const teamRows = (teamStatsRows as Array<{
    team_id: number;
    code: string;
    name: string;
    scored: number;
    conceded: number;
    played: number;
  }>).map((r) => ({
    team: { id: r.team_id, code: r.code, name: r.name },
    scored: r.scored,
    conceded: r.conceded,
    played: r.played,
  }));
  const bestAttack = [...teamRows].sort((a, b) => b.scored - a.scored).slice(0, 3);
  const bestDefense = [...teamRows]
    .sort(
      (a, b) =>
        a.conceded / Math.max(1, a.played) - b.conceded / Math.max(1, b.played),
    )
    .slice(0, 3);

  const avg = (scorerCount.goals / matchAgg.played).toFixed(2);

  const headlineStats = [
    { label: "Partidos jugados", value: matchAgg.played.toString(), hint: `de ${matchAgg.total}` },
    {
      label: "Goles totales",
      value: scorerCount.goals.toString(),
      hint: `${avg} por partido`,
      accent: true,
    },
    { label: "Empates en 90'", value: drawsRow.draws.toString(), hint: "antes de prórroga" },
    { label: "Tandas de penaltis", value: drawsRow.penalties.toString(), hint: "decididas en 11m" },
    { label: "Festival de gol", value: drawsRow.over6.toString(), hint: "partidos +6 goles" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Datos del torneo"
        title="Estadísticas"
        description="El pulso del torneo."
      />

      {/* Headline stats */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {headlineStats.map((s) => (
          <article
            key={s.label}
            className={`relative overflow-hidden rounded-xl border p-5 ${
              s.accent
                ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))]"
                : "border-[var(--color-border)] bg-[var(--color-surface)]"
            }`}
          >
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {s.label}
            </p>
            <p
              className={`mt-2 font-display tabular text-5xl leading-none tracking-tight ${
                s.accent ? "text-[var(--color-arena)] glow-arena" : ""
              }`}
            >
              {s.value}
            </p>
            <p className="mt-2 font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              {s.hint}
            </p>
          </article>
        ))}
      </section>

      {/* Best attack / best defense */}
      <section className="grid gap-4 lg:grid-cols-2">
        <RankPanel
          title="Mejores ataques"
          subtitle="Goles a favor en lo que va de torneo"
          icon={<Target className="size-4" />}
          rows={bestAttack.map((r) => ({
            team: r.team,
            primary: r.scored,
            hint: `${r.played} ${r.played === 1 ? "partido" : "partidos"}`,
          }))}
          unitLabel="goles"
        />
        <RankPanel
          title="Mejores defensas"
          subtitle="Menor promedio de goles encajados"
          icon={<Shield className="size-4" />}
          rows={bestDefense.map((r) => ({
            team: r.team,
            primary: (r.conceded / Math.max(1, r.played)).toFixed(2),
            hint: `${r.conceded} GC en ${r.played} ${r.played === 1 ? "partido" : "partidos"}`,
          }))}
          unitLabel="GC/partido"
        />
      </section>

      {/* Stage breakdown */}
      {stagesAgg.length > 0 ? (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <header className="flex items-center gap-3 pb-4">
            <span className="h-px w-6 bg-[var(--color-arena)]" />
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Goles por fase
            </p>
          </header>
          <ul className="space-y-2">
            {stagesAgg
              .filter((s) => s.played > 0)
              .map((s) => {
                const avgPerMatch =
                  s.played > 0 ? (s.goals / s.played).toFixed(2) : "—";
                return (
                  <li
                    key={s.stage}
                    className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5"
                  >
                    <span className="text-sm font-medium">{STAGE_LABEL[s.stage] ?? s.stage}</span>
                    <span className="flex items-baseline gap-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      <span>
                        <span className="font-display tabular text-base text-[var(--color-foreground)]">
                          {s.played}
                        </span>{" "}
                        partidos
                      </span>
                      <span>
                        <span className="font-display tabular text-base text-[var(--color-arena)] glow-arena">
                          {s.goals}
                        </span>{" "}
                        goles
                      </span>
                      <span className="hidden sm:inline">· {avgPerMatch}/p</span>
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RankPanel({
  title,
  subtitle,
  icon,
  rows,
  unitLabel,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  rows: { team: { code: string; name: string } | null; primary: number | string; hint: string }[];
  unitLabel: string;
}) {
  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <header className="flex items-center justify-between gap-3 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-arena)]">
            {icon}
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em]">{title}</p>
          </div>
          <p className="mt-1 font-editorial text-xs italic text-[var(--color-muted-foreground)]">
            {subtitle}
          </p>
        </div>
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {unitLabel}
        </span>
      </header>
      {rows.length === 0 ? (
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          Aún sin datos suficientes.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 ${
                i === 0 ? "ring-1 ring-[var(--color-arena)]/30" : ""
              }`}
            >
              <span
                className={`font-display tabular text-2xl ${
                  i === 0
                    ? "text-[var(--color-arena)] glow-arena"
                    : "text-[var(--color-muted-foreground)]"
                }`}
              >
                {i + 1}
              </span>
              <TeamFlag code={r.team?.code} size={28} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {r.team?.name ?? "—"}
              </span>
              <span className="text-right">
                <span
                  className={`font-display tabular text-2xl ${
                    i === 0 ? "text-[var(--color-arena)] glow-arena" : ""
                  }`}
                >
                  {r.primary}
                </span>
                <span className="ml-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                  · {r.hint}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
