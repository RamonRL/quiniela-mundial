import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, players, predTournamentTopScorer, teams } from "@/lib/db/schema";
import { Target } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { ScoringBox } from "@/components/brand/scoring-box";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { formatDateTime } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { topScorerScoring } from "@/lib/scoring/copy";
import { TopScorerForm } from "./top-scorer-form";

export const metadata = { title: "Bota de Oro · Predicciones" };

const KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

export default async function PredictTopScorerPage() {
  const me = await requireUser();
  const t = await getTranslations("scoring");
  const leagueId = (await currentLeagueId(me))!;
  // Solo "completo" predice goleador. Marcador / Solo Ganador → fuera.
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  if (mode !== "completo") redirect("/predicciones");
  const [allPlayers, allTeams, allGroups, mine] = await Promise.all([
    db.select().from(players).orderBy(asc(players.name)),
    db.select().from(teams),
    db.select().from(groups).orderBy(asc(groups.code)),
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
  ]);

  if (allPlayers.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Categoría 2"
          title="Bota de Oro"
          description="Tu candidato. Cierra al kickoff."
        />
        <ScoringBox sections={topScorerScoring(t)} />
        <EmptyState
          icon={<Target className="size-5" />}
          title="Aún no hay jugadores cargados"
          description="Pendiente de las plantillas."
        />
      </div>
    );
  }

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const groupById = new Map(allGroups.map((g) => [g.id, g]));
  const teamsByGroup = new Map<string, { code: string; name: string }[]>();
  for (const t of allTeams) {
    const g = t.groupId ? groupById.get(t.groupId) : null;
    if (!g) continue;
    const arr = teamsByGroup.get(g.code) ?? [];
    arr.push({ code: t.code, name: t.name });
    teamsByGroup.set(g.code, arr);
  }
  const groupOpts = allGroups.map((g) => ({
    code: g.code,
    teams: (teamsByGroup.get(g.code) ?? []).sort((a, b) => a.code.localeCompare(b.code)),
  }));

  const open = KICKOFF.getTime() > Date.now();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Categoría 2"
        title="Bota de Oro"
        description={
          open
            ? `Tu candidato al máximo goleador. Cierra ${formatDateTime(KICKOFF)}.`
            : "Cerrada."
        }
      />
      <ScoringBox sections={topScorerScoring(t)} />
      <TopScorerForm
        open={open}
        existingPlayerId={mine[0]?.playerId ?? null}
        groups={groupOpts}
        players={allPlayers.map((p) => {
          const t = teamById.get(p.teamId);
          const g = t?.groupId ? groupById.get(t.groupId) : null;
          return {
            id: p.id,
            name: p.name,
            position: p.position,
            jerseyNumber: p.jerseyNumber,
            photoUrl: p.photoUrl,
            teamCode: t?.code ?? "?",
            teamName: t?.name ?? "—",
            groupCode: g?.code ?? null,
          };
        })}
      />
    </div>
  );
}
