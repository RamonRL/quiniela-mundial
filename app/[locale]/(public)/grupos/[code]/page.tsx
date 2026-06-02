import { TeamFlag } from "@/components/brand/team-flag";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, MapPin } from "lucide-react";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groupStandings,
  groups,
  matches,
  predGroupRanking,
  profiles,
  teams,
} from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { getCurrentUser } from "@/lib/auth/guards";
import { currentLeagueId, inLeagueFilter } from "@/lib/leagues";
import { formatDateTime, initials } from "@/lib/utils";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { GROUP_ANALYSES } from "@/lib/seo/group-analysis";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.code, upper))
    .limit(1);
  if (!group) notFound();
  const groupTeams = await db
    .select({ name: teams.name })
    .from(teams)
    .where(eq(teams.groupId, group.id));
  const names = groupTeams.map((t) => t.name).join(", ");
  return {
    title: `Grupo ${upper}`,
    description: `${names} se enfrentan en el Grupo ${upper} del Mundial 2026. Calendario, clasificación y resultados en directo.`,
    alternates: { canonical: `/grupos/${upper}` },
    openGraph: {
      title: `Grupo ${upper} · Mundial 2026`,
      description: `${names} · Grupo ${upper} del Mundial 2026.`,
      url: `/grupos/${upper}`,
    },
  };
}

void PageHeader;

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const me = await getCurrentUser();
  const leagueId = me ? await currentLeagueId(me) : null;
  const { code } = await params;
  const upper = code.toUpperCase();

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.code, upper))
    .limit(1);
  if (!group) notFound();

  const [groupTeams, standings, groupMatches] = await Promise.all([
    db
      .select()
      .from(teams)
      .where(eq(teams.groupId, group.id))
      .orderBy(asc(teams.name)),
    db.select().from(groupStandings).where(eq(groupStandings.groupId, group.id)),
    db
      .select()
      .from(matches)
      .where(and(eq(matches.groupId, group.id), eq(matches.stage, "group")))
      .orderBy(asc(matches.scheduledAt)),
  ]);

  const teamById = new Map(groupTeams.map((t) => [t.id, t]));
  const standingByTeam = new Map(standings.map((s) => [s.teamId, s]));

  const firstMatchAt = groupMatches[0]?.scheduledAt ?? null;
  const ranksPublic = firstMatchAt ? new Date(firstMatchAt).getTime() <= Date.now() : false;

  // Predicciones solo cuando hay sesión + liga activa. En modo visitante
  // estas queries se saltan; la página renderiza solo datos oficiales.
  const memberFilter = leagueId != null ? inLeagueFilter(leagueId) : undefined;
  const [myPred, otherPreds] = await Promise.all([
    me && leagueId != null
      ? db
          .select()
          .from(predGroupRanking)
          .where(
            and(
              eq(predGroupRanking.userId, me.id),
              eq(predGroupRanking.leagueId, leagueId),
              eq(predGroupRanking.groupId, group.id),
            ),
          )
          .limit(1)
      : Promise.resolve([] as Array<typeof predGroupRanking.$inferSelect>),
    me && leagueId != null && ranksPublic
      ? db
          .select({
            userId: predGroupRanking.userId,
            pos1TeamId: predGroupRanking.pos1TeamId,
            pos2TeamId: predGroupRanking.pos2TeamId,
            pos3TeamId: predGroupRanking.pos3TeamId,
            pos4TeamId: predGroupRanking.pos4TeamId,
            email: profiles.email,
            nickname: profiles.nickname,
            avatarUrl: profiles.avatarUrl,
          })
          .from(predGroupRanking)
          .leftJoin(profiles, eq(predGroupRanking.userId, profiles.id))
          .where(
            and(
              eq(predGroupRanking.groupId, group.id),
              eq(predGroupRanking.leagueId, leagueId),
              ne(predGroupRanking.userId, me.id),
              memberFilter ?? eq(predGroupRanking.leagueId, leagueId),
            ),
          )
      : Promise.resolve([]),
  ]);

  const sortedTeams = [...groupTeams].sort((a, b) => {
    const sa = standingByTeam.get(a.id)?.position ?? 99;
    const sb = standingByTeam.get(b.id)?.position ?? 99;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });

  const myPredPositions = myPred[0]
    ? [myPred[0].pos1TeamId, myPred[0].pos2TeamId, myPred[0].pos3TeamId, myPred[0].pos4TeamId]
    : [];

  const totalPlayed = standings.reduce((acc, s) => acc + s.played, 0);
  const matchesPlayed = Math.floor(totalPlayed / 2); // cuenta cada partido 2 veces
  const goalsFor = standings.reduce((acc, s) => acc + s.goalsFor, 0);
  const finishedMatches = groupMatches.filter((m) => m.status === "finished").length;
  const liveMatches = groupMatches.filter((m) => m.status === "live").length;

  return (
    <div className="space-y-8">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Grupos", href: "/grupos" },
          { name: `Grupo ${group.code}`, href: `/grupos/${group.code}` },
        ]}
      />
      <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
        <Link href="/grupos">
          <ArrowLeft />
          Volver a grupos
        </Link>
      </Button>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-x-0 top-0 h-40 opacity-[0.05]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--color-arena) 28%, transparent), transparent 70%)",
          }}
        />
        <div className="relative grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8 sm:p-8">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Grupo
            </p>
            <h1 className="font-display leading-none tracking-tight text-[var(--color-arena)] glow-arena text-[7rem] sm:text-[10rem]">
              {group.code}
            </h1>
          </div>

          <div className="space-y-5">
            {/* Banderas + nombres */}
            <div className="flex flex-wrap gap-2">
              {sortedTeams.map((t) => (
                <Link
                  key={t.id}
                  href={`/equipos/${t.code}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-sm transition hover:border-[var(--color-arena)]/40 hover:text-[var(--color-arena)]"
                >
                  <TeamFlag code={t.code} size={18} />
                  <span className="font-medium">{t.name}</span>
                </Link>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Stat
                label="Partidos"
                value={`${matchesPlayed} / ${groupMatches.length}`}
                hint={liveMatches > 0 ? "1 en vivo" : null}
                live={liveMatches > 0}
              />
              <Stat label="Finalizados" value={finishedMatches.toString()} />
              <Stat label="Goles" value={goalsFor.toString()} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Standings ─── */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Clasificación
          </h2>
          <span className="h-px flex-1 bg-[var(--color-border)]" />
        </div>
        <article className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <DetailStandingsHeader />
          <ul>
            {sortedTeams.map((t, i) => {
              const s = standingByTeam.get(t.id);
              const pos = i + 1;
              const myPickPos = myPredPositions.findIndex((id) => id === t.id);
              return (
                <DetailStandingRow
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
                  myPickPos={myPickPos}
                />
              );
            })}
          </ul>
        </article>
      </section>

      {/* ─── Análisis del grupo (SEO content) ─── */}
      {(() => {
        const analysis = GROUP_ANALYSES[upper];
        if (!analysis) return null;
        return (
          <section className="space-y-4">
            <header className="flex items-center gap-3">
              <span className="h-px w-6 bg-[var(--color-arena)]" />
              <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                Análisis del grupo
              </h2>
              <span className="h-px flex-1 bg-[var(--color-border)]" />
            </header>
            <article className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
              <p className="font-editorial text-base italic leading-relaxed text-[var(--color-foreground)] sm:text-lg">
                {analysis.intro}
              </p>
              <div className="grid gap-5 sm:grid-cols-3">
                <AnalysisColumn
                  label="El favorito"
                  team={analysis.favorite.team}
                  text={analysis.favorite.text}
                />
                <AnalysisColumn
                  label="El otro cupo"
                  team={analysis.contender.team}
                  text={analysis.contender.text}
                />
                <AnalysisColumn
                  label="Dark horse"
                  team={analysis.darkHorse.team}
                  text={analysis.darkHorse.text}
                />
              </div>
              <div className="rounded-md border-l-2 border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface-2))] px-4 py-3">
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
                  Predicción
                </p>
                <p className="pt-1 text-sm leading-relaxed">
                  {analysis.prediction}
                </p>
              </div>
            </article>
          </section>
        );
      })()}

      {/* ─── Partidos del grupo ─── */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Partidos
          </h2>
          <span className="h-px flex-1 bg-[var(--color-border)]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {groupMatches.map((m) => {
            const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
            const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
            return (
              <MatchCard
                key={m.id}
                m={{
                  id: m.id,
                  code: m.code,
                  scheduledAt: m.scheduledAt,
                  status: m.status,
                  homeScore: m.homeScore,
                  awayScore: m.awayScore,
                  venue: m.venue,
                  homeTeamId: m.homeTeamId,
                  awayTeamId: m.awayTeamId,
                  winnerTeamId: m.winnerTeamId,
                }}
                home={home}
                away={away}
              />
            );
          })}
        </div>
      </section>

      {/* ─── Tu predicción / CTA visitante ─── */}
      {me ? (
        <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Tu predicción
          </h2>
          <span className="h-px flex-1 bg-[var(--color-border)]" />
        </div>
        <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
          {myPred.length === 0 ? (
            <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              Aún sin predicción. Hazla en{" "}
              <Link
                className="text-[var(--color-arena)] underline-offset-2 hover:underline"
                href="/predicciones/grupos"
              >
                Predicciones · Posiciones por grupo
              </Link>
              .
            </p>
          ) : (
            <ol className="grid gap-2 sm:grid-cols-2">
              {myPredPositions.map((teamId, i) => {
                const team = teamId ? teamById.get(teamId) : null;
                const pos = i + 1;
                const advances = pos <= 2;
                const limbo = pos === 3;
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
                return (
                  <li
                    key={i}
                    className={`relative overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] before:absolute before:inset-y-0 before:left-0 before:w-0.5 ${stripe}`}
                  >
                    {team ? (
                      <Link
                        href={`/equipos/${team.code}`}
                        aria-label={team.name}
                        className="flex items-center gap-3 px-3 py-2.5 transition hover:text-[var(--color-arena)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-arena)]"
                      >
                        <span className={`font-display tabular text-2xl tracking-tight ${posColor}`}>
                          {pos}
                        </span>
                        <TeamFlag code={team.code} size={28} />
                        <span className="min-w-0 flex-1 truncate font-display text-base tracking-tight">
                          {team.name}
                        </span>
                        {advances ? (
                          <Badge variant="default" className="text-[0.55rem]">
                            Pasa
                          </Badge>
                        ) : null}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <span className={`font-display tabular text-2xl tracking-tight ${posColor}`}>
                          {pos}
                        </span>
                        <TeamFlag code={undefined} size={28} />
                        <span className="min-w-0 flex-1 truncate font-display text-base tracking-tight">
                          —
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </article>
      </section>

      ) : (
        <section className="rounded-2xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-6 text-center">
          <p className="font-display text-2xl tracking-tight">
            ¿Quién pasa de este grupo?
          </p>
          <p className="pt-1 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Crea tu quiniela y compite con tus amigos prediciendo cada posición.
          </p>
          <Link
            href="/login?next=%2Fpredicciones%2Fgrupos"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
          >
            Crear mi quiniela
          </Link>
        </section>
      )}

      {/* ─── Predicciones de la peña ─── */}
      {me && ranksPublic ? (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-px w-6 bg-[var(--color-arena)]" />
            <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Predicciones de la peña
            </h2>
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
            {otherPreds.length === 0 ? (
              <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                Nadie más predijo este grupo.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {otherPreds.map((p) => {
                  const display = p.nickname || p.email?.split("@")[0] || "—";
                  const t1 = p.pos1TeamId ? teamById.get(p.pos1TeamId) : null;
                  const t2 = p.pos2TeamId ? teamById.get(p.pos2TeamId) : null;
                  return (
                    <li
                      key={p.userId}
                      className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5"
                    >
                      <Avatar className="size-8 border border-[var(--color-border)]">
                        {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="text-[0.6rem]">
                          {initials(display)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {display}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
                          1º
                          <TeamFlag code={t1?.code} size={12} />
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                          2º
                          <TeamFlag code={t2?.code} size={12} />
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        </section>
      ) : null}
    </div>
  );
}

// ──────────────── Helpers ────────────────

function AnalysisColumn({
  label,
  team,
  text,
}: {
  label: string;
  team: string;
  text: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
        {label}
      </p>
      <p className="font-display text-lg tracking-tight">{team}</p>
      <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        {text}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  live,
}: {
  label: string;
  value: string;
  hint?: string | null;
  live?: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p
        className={`mt-0.5 font-display tabular text-2xl tracking-tight ${
          live ? "text-[var(--color-arena)] glow-arena" : "text-[var(--color-foreground)]"
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function DetailStandingsHeader() {
  return (
    <>
      <div className="grid grid-cols-[24px_1fr_28px_36px_44px_44px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-5 py-2 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] sm:hidden">
        <span>#</span>
        <span>Selección</span>
        <span className="text-right">PJ</span>
        <span className="text-right">DG</span>
        <span className="text-right">Pts</span>
        <span className="text-right">Tú</span>
      </div>
      <div className="hidden grid-cols-[24px_1fr_28px_28px_28px_28px_36px_36px_44px_60px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-5 py-2 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] sm:grid">
        <span>#</span>
        <span>Selección</span>
        <span className="text-right">PJ</span>
        <span className="text-right">G</span>
        <span className="text-right">E</span>
        <span className="text-right">P</span>
        <span className="text-right">GF</span>
        <span className="text-right">GC</span>
        <span className="text-right">Pts</span>
        <span className="text-right">Tu pick</span>
      </div>
    </>
  );
}

type DetailStandingRowProps = {
  pos: number;
  team: { id: number; code: string; name: string };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  myPickPos: number;
};

function DetailStandingRow({
  pos,
  team,
  played,
  won,
  drawn,
  lost,
  goalsFor,
  goalsAgainst,
  points,
  myPickPos,
}: DetailStandingRowProps) {
  const advances = pos <= 2;
  const limbo = pos === 3;
  const goalDiff = goalsFor - goalsAgainst;
  const stripe = advances
    ? "before:bg-[var(--color-arena)]"
    : limbo
      ? "before:bg-[var(--color-warning)]/70"
      : "before:bg-transparent";
  const rowBg = advances
    ? "bg-[color-mix(in_oklch,var(--color-arena)_5%,transparent)]"
    : limbo
      ? "bg-[color-mix(in_oklch,var(--color-warning)_4%,transparent)]"
      : "";
  const posColor = advances
    ? "text-[var(--color-arena)]"
    : limbo
      ? "text-[var(--color-warning)]"
      : "text-[var(--color-muted-foreground)]";
  const diffColor =
    goalDiff > 0
      ? "text-[var(--color-success)]"
      : goalDiff < 0
        ? "text-[var(--color-danger)]"
        : "text-[var(--color-muted-foreground)]";
  const pickBadge =
    myPickPos >= 0 ? (
      <span className="inline-flex items-center justify-center rounded-full border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_10%,transparent)] px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
        {myPickPos + 1}º
      </span>
    ) : null;

  return (
    <li
      className={`relative border-b border-[var(--color-border)] last:border-b-0 before:absolute before:inset-y-0 before:left-0 before:w-0.5 ${stripe} ${rowBg}`}
    >
      <Link
        href={`/equipos/${team.code}`}
        className="block transition hover:bg-[var(--color-surface-2)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-arena)]"
        aria-label={team.name}
      >
      <div className="grid grid-cols-[24px_1fr_28px_36px_44px_44px] items-center gap-2 px-5 py-2.5 sm:hidden">
        <span className={`font-display tabular text-base ${posColor}`}>{pos}</span>
        <span className="flex min-w-0 items-center gap-2">
          <TeamFlag code={team.code} size={20} />
          <span className="truncate text-sm font-medium">{team.name}</span>
        </span>
        <span className="text-right font-mono text-xs tabular text-[var(--color-muted-foreground)]">
          {played}
        </span>
        <span className={`text-right font-mono text-xs tabular ${diffColor}`}>
          {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
        </span>
        <span
          className={`text-right font-display tabular text-lg ${
            advances ? "text-[var(--color-arena)] glow-arena" : ""
          }`}
        >
          {points}
        </span>
        <span className="text-right">{pickBadge}</span>
      </div>
      <div className="hidden grid-cols-[24px_1fr_28px_28px_28px_28px_36px_36px_44px_60px] items-center gap-2 px-5 py-2.5 sm:grid">
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
        <span className="text-right">{pickBadge}</span>
      </div>
      </Link>
    </li>
  );
}

// ──────────────── Match card · estilo /calendario ────────────────

type MatchRow = {
  id: number;
  code: string;
  scheduledAt: Date;
  status: "scheduled" | "live" | "finished";
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  winnerTeamId: number | null;
};

function MatchCard({
  m,
  home,
  away,
}: {
  m: MatchRow;
  home: { name: string; code: string; flagUrl: string | null } | null | undefined;
  away: { name: string; code: string; flagUrl: string | null } | null | undefined;
}) {
  const isFinished = m.status === "finished";
  const isLive = m.status === "live";
  const winnerHome =
    isFinished && m.winnerTeamId != null && m.winnerTeamId === m.homeTeamId;
  const winnerAway =
    isFinished && m.winnerTeamId != null && m.winnerTeamId === m.awayTeamId;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-arena)]/40 hover:shadow-[var(--shadow-elev-2)]">
      <Link
        href={`/partido/${m.id}`}
        aria-label={`Partido ${m.code}`}
        className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
      />
      <header className="relative flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
          {m.code}
        </span>
        <StatusPill status={m.status} />
      </header>

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-5 sm:gap-3 sm:py-6">
        <TeamSide team={home} side="home" winner={winnerHome} />
        <ScoreCenter
          home={m.homeScore}
          away={m.awayScore}
          status={m.status}
          scheduledAt={m.scheduledAt}
        />
        <TeamSide team={away} side="away" winner={winnerAway} />
      </div>

      <footer className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3 shrink-0" />
          {formatDateTime(m.scheduledAt, {
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {m.venue ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{m.venue}</span>
          </span>
        ) : null}
      </footer>

      {isLive ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-arena)] to-transparent"
        />
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: MatchRow["status"] }) {
  if (status === "finished") {
    return (
      <Badge variant="success" className="text-[0.55rem]">
        Final
      </Badge>
    );
  }
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
        <span className="relative flex size-1.5">
          <span
            aria-hidden
            className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70"
          />
          <span className="relative inline-flex size-1.5 rounded-full bg-[var(--color-arena)]" />
        </span>
        En vivo
      </span>
    );
  }
  return (
    <Badge variant="outline" className="text-[0.55rem]">
      Programado
    </Badge>
  );
}

function TeamSide({
  team,
  side,
  winner,
}: {
  team: { name: string; code: string; flagUrl: string | null } | null | undefined;
  side: "home" | "away";
  winner: boolean;
}) {
  const isHome = side === "home";
  const Wrapper: React.ElementType = team ? Link : "div";
  const wrapperProps = team
    ? {
        href: `/equipos/${team.code}`,
        "aria-label": team.name,
      }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={`relative z-10 flex min-w-0 items-center gap-2 sm:gap-3 ${
        isHome ? "flex-row-reverse text-right" : "text-left"
      } ${team ? "transition hover:text-[var(--color-arena)]" : ""}`}
    >
      <span className={`shrink-0 transition-transform ${winner ? "scale-105" : ""}`}>
        <span className="block sm:hidden">
          <TeamFlag code={team?.code} size={28} />
        </span>
        <span className="hidden sm:block">
          <TeamFlag code={team?.code} size={36} />
        </span>
      </span>
      <div className="min-w-0">
        <p
          className="font-display text-sm leading-[1.05] tracking-tight sm:text-base"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {team?.name ?? "—"}
        </p>
        <p className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
          {team?.code ?? "—"}
        </p>
      </div>
    </Wrapper>
  );
}

function ScoreCenter({
  home,
  away,
  status,
  scheduledAt,
}: {
  home: number | null;
  away: number | null;
  status: MatchRow["status"];
  scheduledAt: Date;
}) {
  if (status === "scheduled") {
    return (
      <div className="flex flex-col items-center gap-0.5 px-1 sm:px-2">
        <span className="font-display text-xl tracking-tight text-[var(--color-muted-foreground)]/70 sm:text-2xl">
          vs
        </span>
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {formatDateTime(scheduledAt, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    );
  }
  return (
    <div
      className={`flex items-baseline gap-1.5 px-1 sm:gap-2 sm:px-2 ${
        status === "live" ? "text-[var(--color-arena)] glow-arena" : ""
      }`}
    >
      <span className="font-display tabular text-3xl leading-none tracking-tighter sm:text-4xl">
        {home ?? 0}
      </span>
      <span className="font-display text-lg leading-none text-[var(--color-muted-foreground)]/70 sm:text-xl">
        ·
      </span>
      <span className="font-display tabular text-3xl leading-none tracking-tighter sm:text-4xl">
        {away ?? 0}
      </span>
    </div>
  );
}
