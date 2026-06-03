import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, pointsLedger, profiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, inLeagueFilter, isPremiumTier } from "@/lib/leagues";

export const dynamic = "force-dynamic";

/**
 * Devuelve el ranking de la liga activa del usuario como CSV. Solo
 * accesible para owners de ligas premium — la idea es que RRHH pueda
 * descargarlo al final del torneo para entregar premios.
 *
 * Campos: posición, nombre, email, puntos, alta.
 */
export async function GET() {
  const me = await requireUser();
  const leagueId = await currentLeagueId(me);
  if (leagueId == null) {
    return new Response("Sin liga activa.", { status: 400 });
  }

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league || league.isPublic) {
    return new Response("La quiniela pública no admite export.", { status: 400 });
  }
  if (league.createdBy !== me.id) {
    return new Response("Solo el creador puede exportar.", { status: 403 });
  }
  if (!isPremiumTier(league.tier)) {
    return new Response(
      "Export CSV está incluido en los Pases Mundial 2026. Mira /precios.",
      { status: 402 },
    );
  }

  const memberFilter = inLeagueFilter(leagueId)!;
  const [members, pointsRows] = await Promise.all([
    db
      .select({
        id: profiles.id,
        email: profiles.email,
        nickname: profiles.nickname,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(memberFilter)
      .orderBy(asc(profiles.createdAt)),
    db
      .select({
        userId: pointsLedger.userId,
        total: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int`,
      })
      .from(pointsLedger)
      .where(eq(pointsLedger.leagueId, leagueId))
      .groupBy(pointsLedger.userId),
  ]);
  const pointsByUser = new Map(pointsRows.map((r) => [r.userId, r.total]));

  const rows = members
    .map((m) => ({
      name: m.nickname || m.email.split("@")[0],
      email: m.email,
      points: pointsByUser.get(m.id) ?? 0,
      createdAt: m.createdAt,
    }))
    .sort((a, b) => b.points - a.points);

  const csvEscape = (val: string) =>
    /[",\n;]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;

  const header = ["Posicion", "Nombre", "Email", "Puntos", "Alta"].join(",");
  const body = rows
    .map((r, i) =>
      [
        i + 1,
        csvEscape(r.name),
        csvEscape(r.email),
        r.points,
        r.createdAt.toISOString().slice(0, 10),
      ].join(","),
    )
    .join("\n");

  // BOM UTF-8 para que Excel detecte la codificación al abrir.
  const csv = `﻿${header}\n${body}\n`;

  const slug = league.slug.replace(/[^a-z0-9-]/gi, "");
  const filename = `ranking-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
