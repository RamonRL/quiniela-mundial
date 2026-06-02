import { TeamFlag } from "@/components/brand/team-flag";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groups,
  leagues,
  players,
  predBracketSlot,
  predGroupRanking,
  predTournamentTopScorer,
  profiles,
  teams,
} from "@/lib/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { Lock, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, inLeagueFilter } from "@/lib/leagues";
import { formatDateTime } from "@/lib/utils";
import { formatRemaining } from "@/lib/deadlines";
import { getBracketStatus } from "@/lib/bracket-state";
import { OpponentPicker } from "./opponent-picker";

export const metadata = { title: "Comparar predicciones" };

const KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ vs?: string }>;
}) {
  const me = await requireUser();
  const leagueId = (await currentLeagueId(me))!;
  // Comparar solo aplica a quinielas privadas. Si el usuario está en la
  // pública (caso típico: aterriza por URL guardada o tras abandonar la
  // privada activa), redirigimos al dashboard.
  const [activeLeague] = await db
    .select({ isPublic: leagues.isPublic })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (activeLeague?.isPublic) redirect("/dashboard");
  const params = await searchParams;
  const vsId = params.vs ?? null;
  // Oponentes: miembros de la misma liga + admins (globales). Excluido yo.
  const leagueFilter = inLeagueFilter(leagueId);
  const opponentFilter = leagueFilter
    ? and(ne(profiles.id, me.id), leagueFilter)
    : ne(profiles.id, me.id);
  const allUsers = await db
    .select()
    .from(profiles)
    .where(opponentFilter)
    .orderBy(asc(profiles.email));

  if (allUsers.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Cara a cara"
          title="Compara predicciones"
          description="Hace falta alguien con quien medirte."
        />
        <EmptyState
          icon={<Trophy className="size-5" />}
          title="Aún sólo estás tú"
          description="Comparte el enlace y a por ello."
        />
      </div>
    );
  }

  const opponent = vsId ? allUsers.find((u) => u.id === vsId) ?? null : allUsers[0];

  // Group rankings + Bota de Oro se hacen públicos al kickoff del torneo.
  // Bracket sólo cuando arranca R32.
  const tournamentPredsPublic = KICKOFF.getTime() <= Date.now();
  const bracketStatus = await getBracketStatus();
  const bracketPublic = bracketStatus.state === "closed";

  const [myGroups, opponentGroups, allGroups, allTeams, myChamp, oppChamp, myTop, oppTop] =
    await Promise.all([
      db
        .select()
        .from(predGroupRanking)
        .where(
          and(
            eq(predGroupRanking.userId, me.id),
            eq(predGroupRanking.leagueId, leagueId),
          ),
        ),
      opponent
        ? db
            .select()
            .from(predGroupRanking)
            .where(
              and(
                eq(predGroupRanking.userId, opponent.id),
                eq(predGroupRanking.leagueId, leagueId),
              ),
            )
        : Promise.resolve([]),
      db.select().from(groups).orderBy(asc(groups.code)),
      db.select().from(teams),
      db
        .select()
        .from(predBracketSlot)
        .where(
          and(
            eq(predBracketSlot.userId, me.id),
            eq(predBracketSlot.leagueId, leagueId),
          ),
        ),
      opponent
        ? db
            .select()
            .from(predBracketSlot)
            .where(
              and(
                eq(predBracketSlot.userId, opponent.id),
                eq(predBracketSlot.leagueId, leagueId),
              ),
            )
        : Promise.resolve([]),
      db
        .select()
        .from(predTournamentTopScorer)
        .where(
          and(
            eq(predTournamentTopScorer.userId, me.id),
            eq(predTournamentTopScorer.leagueId, leagueId),
          ),
        )
        .limit(1),
      opponent
        ? db
            .select()
            .from(predTournamentTopScorer)
            .where(
              and(
                eq(predTournamentTopScorer.userId, opponent.id),
                eq(predTournamentTopScorer.leagueId, leagueId),
              ),
            )
            .limit(1)
        : Promise.resolve([]),
    ]);

  // Solo cargar los 2 jugadores que de verdad necesitamos (los picks de Bota
  // de Oro). Antes traíamos toda la tabla `players` (~1300 filas tras el seed
  // de plantillas) sólo para hacer dos lookups — ese era el origen de los
  // timeouts en /comparar.
  const topScorerIds = [
    myTop[0]?.playerId ?? null,
    oppTop[0]?.playerId ?? null,
  ].filter((x): x is number => x != null);
  const topPlayerRows =
    topScorerIds.length > 0
      ? await db.select().from(players).where(inArray(players.id, topScorerIds))
      : [];

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const playerById = new Map(topPlayerRows.map((p) => [p.id, p]));

  function findGroupPred(rows: typeof myGroups, groupId: number) {
    return rows.find((r) => r.groupId === groupId) ?? null;
  }

  const myChampionTeamId = myChamp.find((b) => b.stage === "final" && b.slotPosition === 0)
    ?.predictedTeamId;
  const oppChampionTeamId = oppChamp.find((b) => b.stage === "final" && b.slotPosition === 0)
    ?.predictedTeamId;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cara a cara"
        title="Compara predicciones"
        description="Tus picks contra las suyas."
      />
      <OpponentPicker
        currentUserId={me.id}
        currentOpponentId={opponent?.id ?? null}
        opponents={allUsers.map((u) => ({
          id: u.id,
          email: u.email,
          nickname: u.nickname,
          avatarUrl: u.avatarUrl,
        }))}
      />

      {!opponent ? (
        <EmptyState
          icon={<Trophy className="size-5" />}
          title="Selecciona un oponente"
          description="Elige rival en el desplegable."
        />
      ) : !tournamentPredsPublic ? (
        <PreKickoffTeaser
          opponentName={opponent.nickname || opponent.email.split("@")[0]}
        />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-2xl">Posiciones por grupo</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {allGroups.map((g) => {
                const m = findGroupPred(myGroups, g.id);
                const o = findGroupPred(opponentGroups, g.id);
                if (!m && !o) return null;
                const myIds = [m?.pos1TeamId, m?.pos2TeamId, m?.pos3TeamId, m?.pos4TeamId];
                const oppIds = [o?.pos1TeamId, o?.pos2TeamId, o?.pos3TeamId, o?.pos4TeamId];
                const matches = myIds.map((id, i) => id != null && id === oppIds[i]);
                const matchCount = matches.filter(Boolean).length;
                return (
                  <Card key={g.id}>
                    <CardHeader className="flex flex-row items-baseline justify-between gap-2">
                      <CardTitle className="text-base">{g.name}</CardTitle>
                      <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
                        {matchCount}/4 coinciden
                      </span>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5">
                        {[0, 1, 2, 3].map((i) => {
                          const myTeam = teamById.get(myIds[i] ?? -1) ?? null;
                          const oppTeam = teamById.get(oppIds[i] ?? -1) ?? null;
                          const match = matches[i];
                          return (
                            <li
                              key={i}
                              className={`grid grid-cols-[28px_1fr_24px_1fr] items-center gap-2 rounded-md px-2 py-1.5 ${
                                match
                                  ? "bg-[color-mix(in_oklch,var(--color-success)_8%,transparent)] ring-1 ring-[var(--color-success)]/30"
                                  : ""
                              }`}
                            >
                              <span className="font-display tabular text-base text-[var(--color-muted-foreground)]">
                                {i + 1}º
                              </span>
                              <ComparisonCell team={myTeam} match={match} />
                              <span
                                className={`text-center font-mono text-[0.7rem] ${
                                  match
                                    ? "text-[var(--color-success)]"
                                    : "text-[var(--color-muted-foreground)]/40"
                                }`}
                              >
                                {match ? "=" : "·"}
                              </span>
                              <ComparisonCell team={oppTeam} match={match} align="end" />
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl">Bota de Oro & Campeón</h2>
            {!bracketPublic ? (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                El campeón se desvelará cuando empiecen los dieciseisavos.
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tú</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Pair
                    label="Bota de Oro"
                    value={myTop[0] ? playerById.get(myTop[0].playerId ?? -1)?.name ?? "—" : "—"}
                  />
                  <Pair
                    label="Campeón"
                    value={
                      bracketPublic
                        ? teamById.get(myChampionTeamId ?? -1)?.name ?? "—"
                        : "(privado hasta R32)"
                    }
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {opponent.nickname || opponent.email.split("@")[0]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Pair
                    label="Bota de Oro"
                    value={
                      oppTop[0] ? playerById.get(oppTop[0].playerId ?? -1)?.name ?? "—" : "—"
                    }
                  />
                  <Pair
                    label="Campeón"
                    value={
                      bracketPublic
                        ? teamById.get(oppChampionTeamId ?? -1)?.name ?? "—"
                        : "(privado hasta R32)"
                    }
                  />
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}

      <p className="text-xs text-[var(--color-muted-foreground)]">
        Tip: ve también al{" "}
        <Link href="/ranking" className="underline">
          ranking
        </Link>{" "}
        para ver puntos vs tus amigos.
      </p>
    </div>
  );
}

function ComparisonCell({
  team,
  match,
  align = "start",
}: {
  team: { name: string; code: string; flagUrl: string | null } | null;
  match: boolean;
  align?: "start" | "end";
}) {
  if (!team) {
    return (
      <span
        className={`text-sm text-[var(--color-muted-foreground)] ${
          align === "end" ? "text-right" : ""
        }`}
      >
        —
      </span>
    );
  }
  return (
    <span
      className={`flex min-w-0 items-center gap-2 ${
        align === "end" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <TeamFlag code={team.code} size={20} />
      <span
        className={`truncate text-sm ${
          match ? "font-semibold text-[var(--color-success)]" : "font-medium"
        }`}
      >
        {team.name}
      </span>
    </span>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-[var(--color-border)] pb-1.5 last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function PreKickoffTeaser({ opponentName }: { opponentName: string }) {
  const ms = Math.max(0, KICKOFF.getTime() - Date.now());
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))]">
      <div className="halftone pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden />
      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
            <Lock className="size-3" />
            Aún privadas
          </div>
          <h3 className="font-display text-3xl tracking-tight">
            Las predicciones de <span className="font-medium">{opponentName}</span> se desvelan al kickoff
          </h3>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Posiciones de grupo y Bota de Oro se publican el {formatDateTime(KICKOFF)}.
            El bracket queda privado hasta el primer partido de dieciseisavos.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 lg:items-end lg:text-right">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Faltan
          </p>
          <p className="font-display tabular text-5xl leading-none tracking-tighter text-[var(--color-arena)] glow-arena sm:text-6xl">
            {formatRemaining(ms)}
          </p>
        </div>
      </div>
    </div>
  );
}
