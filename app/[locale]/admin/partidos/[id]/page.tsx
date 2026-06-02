import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchScorers, matches, players, teams } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { formatDateTime } from "@/lib/utils";
import { ResultForm } from "./result-form";

export default async function AdminMatchResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) notFound();

  const involvedTeamIds = [match.homeTeamId, match.awayTeamId].filter(
    (x): x is number => x != null,
  );
  const [allTeams, matchPlayers, existingScorers] = await Promise.all([
    db.select().from(teams),
    involvedTeamIds.length > 0
      ? db
          .select()
          .from(players)
          .where(inArray(players.teamId, involvedTeamIds))
          .orderBy(asc(players.name))
      : Promise.resolve([]),
    db.select().from(matchScorers).where(eq(matchScorers.matchId, matchId)),
  ]);

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const home = match.homeTeamId ? teamById.get(match.homeTeamId) : null;
  const away = match.awayTeamId ? teamById.get(match.awayTeamId) : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
        <Link href="/admin/partidos">
          <ArrowLeft />
          Volver a resultados
        </Link>
      </Button>
      <PageHeader
        eyebrow={match.stage.toUpperCase()}
        title={`${home?.name ?? "—"} vs ${away?.name ?? "—"}`}
        description={`Código ${match.code} · ${formatDateTime(match.scheduledAt)}${match.venue ? ` · ${match.venue}` : ""}`}
      />
      <ResultForm
        match={{
          id: match.id,
          stage: match.stage,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          status: match.status,
          wentToPens: match.wentToPens,
          homeScorePen: match.homeScorePen,
          awayScorePen: match.awayScorePen,
          winnerTeamId: match.winnerTeamId,
        }}
        homeTeam={home ? { id: home.id, name: home.name, code: home.code } : null}
        awayTeam={away ? { id: away.id, name: away.name, code: away.code } : null}
        players={matchPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          teamId: p.teamId,
          jerseyNumber: p.jerseyNumber,
        }))}
        existingScorers={existingScorers.map((s) => ({
          playerId: s.playerId,
          teamId: s.teamId,
          minute: s.minute,
          isOwnGoal: s.isOwnGoal,
          isPenalty: s.isPenalty,
        }))}
      />
    </div>
  );
}
