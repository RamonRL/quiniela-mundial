import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueMemberships, leagues, profiles } from "@/lib/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { Trophy } from "lucide-react";
import { CreateLeagueDialog } from "./create-league-dialog";
import { LeaguesView, type LeagueRow, type PreviewMember } from "./leagues-view";

export const metadata = { title: "Ligas · Admin" };
export const dynamic = "force-dynamic";

const PREVIEW_PER_LEAGUE = 5;

export default async function AdminLeaguesPage() {
  // Pública primero, luego privadas de la MÁS RECIENTE a la más antigua. Antes
  // se ordenaban asc(createdAt) — invertido para que aparezcan arriba las
  // ligas recién creadas (que es lo que más se necesita gestionar).
  const allLeagues = await db
    .select({
      id: leagues.id,
      slug: leagues.slug,
      name: leagues.name,
      inviteToken: leagues.inviteToken,
      joinCode: leagues.joinCode,
      isPublic: leagues.isPublic,
      logoUrl: leagues.logoUrl,
      tier: leagues.tier,
      memberLimit: leagues.memberLimit,
      createdAt: leagues.createdAt,
      createdBy: leagues.createdBy,
      creatorEmail: profiles.email,
      creatorNickname: profiles.nickname,
    })
    .from(leagues)
    .leftJoin(profiles, eq(profiles.id, leagues.createdBy))
    .orderBy(desc(leagues.isPublic), desc(leagues.createdAt));

  const memberRows = await db
    .select({
      leagueId: leagueMemberships.leagueId,
      count: sql<number>`count(*)::int`,
    })
    .from(leagueMemberships)
    .groupBy(leagueMemberships.leagueId);
  const memberByLeague = new Map(memberRows.map((r) => [r.leagueId, r.count]));

  // Preview de 5 miembros por liga en una sola query con window function. A
  // escala (Cofiño con 1000 miembros) traer todas las membresías sería
  // ineficiente; con row_number() OVER (PARTITION BY leagueId) cortamos a
  // 5 por grupo en SQL.
  type PreviewRow = {
    leagueId: number;
    id: string;
    nickname: string | null;
    email: string;
    avatarUrl: string | null;
  };
  const previewRaw = await db.execute<PreviewRow>(sql`
    WITH ranked AS (
      SELECT
        lm.league_id  AS "leagueId",
        p.id          AS "id",
        p.nickname    AS "nickname",
        p.email       AS "email",
        p.avatar_url  AS "avatarUrl",
        row_number() OVER (
          PARTITION BY lm.league_id
          ORDER BY lm.joined_at ASC, p.id ASC
        ) AS rn
      FROM league_memberships lm
      JOIN profiles p ON p.id = lm.user_id
      WHERE p.banned_at IS NULL
    )
    SELECT "leagueId", "id", "nickname", "email", "avatarUrl"
    FROM ranked
    WHERE rn <= ${PREVIEW_PER_LEAGUE}
  `);
  const previewRows = previewRaw as PreviewRow[];
  const previewByLeague = new Map<number, PreviewMember[]>();
  for (const r of previewRows) {
    const list = previewByLeague.get(r.leagueId) ?? [];
    list.push({
      id: r.id,
      nickname: r.nickname,
      email: r.email,
      avatarUrl: r.avatarUrl,
    });
    previewByLeague.set(r.leagueId, list);
  }

  const enriched: LeagueRow[] = allLeagues.map((l) => ({
    id: l.id,
    slug: l.slug,
    name: l.name,
    inviteToken: l.inviteToken,
    joinCode: l.joinCode,
    isPublic: l.isPublic,
    logoUrl: l.logoUrl,
    tier: l.tier,
    memberLimit: l.memberLimit,
    createdAt: l.createdAt.toISOString(),
    creator:
      l.creatorEmail || l.creatorNickname
        ? {
            nickname: l.creatorNickname,
            email: l.creatorEmail ?? "",
          }
        : null,
    members: memberByLeague.get(l.id) ?? 0,
    previewMembers: previewByLeague.get(l.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Ligas"
        description="Pública + privadas, ordenadas de la más reciente a la más antigua. Hasta 5 privadas por usuario."
        actions={<CreateLeagueDialog />}
      />

      {enriched.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-5" />}
          title="No hay ligas"
          description="Comprueba la BD."
        />
      ) : (
        <LeaguesView leagues={enriched} />
      )}
    </div>
  );
}
