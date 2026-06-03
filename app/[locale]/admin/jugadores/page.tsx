import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, teams } from "@/lib/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { JugadoresWorkspace } from "./jugadores-workspace";

export const metadata = { title: "Jugadores · Admin" };

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const params = await searchParams;
  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));
  const teamId = params.team ? Number(params.team) : (allTeams[0]?.id ?? null);
  const teamPlayers =
    teamId != null
      ? await db.select().from(players).where(eq(players.teamId, teamId)).orderBy(asc(players.jerseyNumber))
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Plantillas y jugadores"
        description="26 jugadores por selección. Importa en bulk pegando una lista."
      />
      <JugadoresWorkspace
        teams={allTeams.map((t) => ({ id: t.id, code: t.code, name: t.name, flagUrl: t.flagUrl }))}
        currentTeamId={teamId}
        players={teamPlayers.map((p) => ({
          id: p.id,
          teamId: p.teamId,
          name: p.name,
          position: p.position,
          jerseyNumber: p.jerseyNumber,
          photoUrl: p.photoUrl,
        }))}
      />
    </div>
  );
}
