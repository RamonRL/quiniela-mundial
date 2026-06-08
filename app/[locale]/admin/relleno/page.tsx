import { like, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, leagueMemberships, profiles } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RellenoRow } from "./relleno-row";

export const metadata = { title: "Usuarios de relleno · Admin" };
export const dynamic = "force-dynamic";

/**
 * Gestión de los usuarios de relleno (@demo.invalid): los dummies de la
 * liga demo y de las quinielas de promoción. Permite editar su apodo y su
 * foto a mano para que parezcan más reales. No computan en KPIs ni en el
 * ranking global (filtrados por email en otras partes).
 */
export default async function RellenoPage() {
  await requireAdmin();

  // Cada relleno con su liga (vía membresía). Un dummy está en una sola liga.
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
      leagueName: leagues.name,
      leagueId: leagues.id,
    })
    .from(profiles)
    .leftJoin(leagueMemberships, eq(leagueMemberships.userId, profiles.id))
    .leftJoin(leagues, eq(leagues.id, leagueMemberships.leagueId))
    .where(like(profiles.email, "%@demo.invalid"))
    .orderBy(asc(profiles.email));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Usuarios de relleno"
        description={`${rows.length} cuenta${rows.length === 1 ? "" : "s"} @demo.invalid · edita apodo y foto a mano. No cuentan en KPIs ni en el ranking global.`}
      />

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Foto</TableHead>
              <TableHead>Apodo</TableHead>
              <TableHead className="hidden sm:table-cell">Liga</TableHead>
              <TableHead className="w-44 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <RellenoRow
                key={r.id}
                userId={r.id}
                nickname={r.nickname ?? ""}
                avatarUrl={r.avatarUrl}
                leagueName={r.leagueName}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
