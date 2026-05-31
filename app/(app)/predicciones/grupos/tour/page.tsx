import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, predGroupRanking, teams } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { GroupsTourClient } from "./tour-client";

export const metadata = { title: "Modo interactivo · Grupos" };
export const dynamic = "force-dynamic";

const KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

export default async function GroupsTourPage(props: {
  searchParams: Promise<{ step?: string }>;
}) {
  const me = await requireUser();
  const leagueId = (await currentLeagueId(me))!;
  // Solo "completo" predice grupos. Marcador / Solo Ganador → fuera.
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  if (mode !== "completo") redirect("/predicciones");

  // Si la deadline pasó, el tour deja de tener sentido — al full-page que sí
  // muestra modo solo lectura.
  if (KICKOFF.getTime() <= Date.now()) {
    redirect("/predicciones/grupos");
  }

  const [allGroups, allTeams, myPreds] = await Promise.all([
    db.select().from(groups).orderBy(asc(groups.code)),
    db.select().from(teams).orderBy(asc(teams.name)),
    db
      .select()
      .from(predGroupRanking)
      .where(
        and(
          eq(predGroupRanking.userId, me.id),
          eq(predGroupRanking.leagueId, leagueId),
        ),
      ),
  ]);

  // Si el torneo aún no tiene todos los grupos cargados, no abrimos el
  // tour — volver al full-page que ya gestiona el empty-state.
  const ready =
    allGroups.length === 12 &&
    allTeams.filter((t) => t.groupId != null).length === 48;
  if (!ready) redirect("/predicciones/grupos");

  const teamsByGroup = new Map<number, typeof allTeams>();
  for (const t of allTeams) {
    if (t.groupId == null) continue;
    const arr = teamsByGroup.get(t.groupId) ?? [];
    arr.push(t);
    teamsByGroup.set(t.groupId, arr);
  }

  const predByGroup = new Map(myPreds.map((p) => [p.groupId, p]));

  // Primer grupo sin predicción completa. Si todos están completos →
  // arrancar en 0 (el cliente muestra un toast informativo al montar).
  let firstUnpredicted = -1;
  allGroups.forEach((g, idx) => {
    if (firstUnpredicted !== -1) return;
    const p = predByGroup.get(g.id);
    const complete =
      p &&
      p.pos1TeamId != null &&
      p.pos2TeamId != null &&
      p.pos3TeamId != null &&
      p.pos4TeamId != null;
    if (!complete) firstUnpredicted = idx;
  });
  const allComplete = firstUnpredicted === -1;
  const defaultStep = allComplete ? 0 : firstUnpredicted;

  // Step desde la URL si llega; sino el calculado. Clamp dentro de rango.
  const sp = await props.searchParams;
  const fromUrl = sp.step != null ? parseInt(sp.step, 10) : NaN;
  const initialStep = Number.isFinite(fromUrl)
    ? Math.max(0, Math.min(allGroups.length - 1, fromUrl))
    : defaultStep;

  // Estructura serializable para el client.
  const items = allGroups.map((g) => {
    const groupTeams = (teamsByGroup.get(g.id) ?? []).map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
    }));
    const pred = predByGroup.get(g.id);
    const order =
      pred && pred.pos1TeamId && pred.pos2TeamId && pred.pos3TeamId && pred.pos4TeamId
        ? [pred.pos1TeamId, pred.pos2TeamId, pred.pos3TeamId, pred.pos4TeamId]
        : groupTeams.map((t) => t.id);
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      teams: groupTeams,
      initialOrder: order,
    };
  });

  return (
    <GroupsTourClient
      items={items}
      initialStep={initialStep}
      allCompleteOnEntry={allComplete}
    />
  );
}
