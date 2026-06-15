import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Link2 } from "lucide-react";
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
      <Link
        href="/admin/jugadores/vincular"
        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40 hover:text-[var(--color-arena)]"
      >
        <Link2 className="size-3.5" /> Vincular con API-Football
      </Link>
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
