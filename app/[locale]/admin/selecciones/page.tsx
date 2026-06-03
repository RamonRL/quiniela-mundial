import { asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, players, teams } from "@/lib/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { TeamsTable } from "./teams-table";

export const metadata = { title: "Selecciones · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const [allTeams, allGroups, statRows] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.name)),
    db.select().from(groups).orderBy(asc(groups.code)),
    db
      .select({
        teamId: players.teamId,
        total: sql<number>`count(*)::int`,
        missingJersey: sql<number>`count(*) filter (where ${players.jerseyNumber} is null)::int`,
        missingPhoto: sql<number>`count(*) filter (where ${players.photoUrl} is null)::int`,
        missingPosition: sql<number>`count(*) filter (where ${players.position} is null)::int`,
      })
      .from(players)
      .groupBy(players.teamId),
  ]);

  const stats = Object.fromEntries(
    statRows.map((r) => [
      r.teamId,
      {
        total: r.total,
        missingJersey: r.missingJersey,
        missingPhoto: r.missingPhoto,
        missingPosition: r.missingPosition,
      },
    ]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Selecciones"
        description="Las 48 selecciones. Banderas en PNG cuadrado."
      />
      <TeamsTable teams={allTeams} groups={allGroups} stats={stats} />
    </div>
  );
}
