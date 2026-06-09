import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groupStandings, matches } from "@/lib/db/schema";
import { rankGroupStandings, type H2HMatch } from "./group-standings-rank";

/**
 * Recompute the `group_standings` table from the current state of finished
 * fase-de-grupos matches. Idempotent: wipes and re-inserts each affected
 * group's rows in a single transaction.
 *
 * Llamada cada vez que se guarda un resultado de la fase de grupos para que
 * los públicos `/grupos` y `/grupos/[code]` muestren PJ/G/E/P/GF/GC/Pts en
 * vivo. La operación NO toca el `points_ledger` — el cálculo de puntos por
 * categoría "Posiciones de grupo" sigue siendo manual desde
 * `/admin/operaciones` (un admin verifica antes de repartir).
 *
 * Desempates (criterio FIFA 2026, en orden):
 *   1. puntos · 2. diferencia de goles · 3. goles a favor (todos los partidos
 *      del grupo). Si dos o más siguen empatadas, mini-liga entre ellas:
 *   4. puntos · 5. diferencia de goles · 6. goles a favor (solo en los partidos
 *      entre las empatadas). Tras eso FIFA usa fair-play y sorteo, que no
 *      modelamos: como último recurso ordenamos por `teamId` para que el orden
 *      sea DETERMINISTA y reproducible (no dependiente del orden de inserción).
 *
 * Esto importa: el orquestador puntúa la Categoría 1 y siembra el R32 (pos 1 y
 * 2) automáticamente al cerrar el grupo, así que el orden de empate se usa sin
 * intervención humana.
 */
export async function recomputeAllGroupStandings(): Promise<{
  groupCount: number;
}> {
  const groupMatches = await db
    .select()
    .from(matches)
    .where(and(eq(matches.stage, "group"), eq(matches.status, "finished")));

  type Agg = {
    groupId: number;
    teamId: number;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  };
  const agg = new Map<string, Agg>();
  function ensure(groupId: number, teamId: number): Agg {
    const key = `${groupId}-${teamId}`;
    const existing = agg.get(key);
    if (existing) return existing;
    const fresh: Agg = {
      groupId,
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    };
    agg.set(key, fresh);
    return fresh;
  }

  for (const m of groupMatches) {
    if (m.groupId == null || m.homeTeamId == null || m.awayTeamId == null) continue;
    if (m.homeScore == null || m.awayScore == null) continue;
    const home = ensure(m.groupId, m.homeTeamId);
    const away = ensure(m.groupId, m.awayTeamId);
    home.played += 1;
    away.played += 1;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (m.homeScore < m.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const byGroup = new Map<number, Agg[]>();
  for (const v of agg.values()) {
    const arr = byGroup.get(v.groupId) ?? [];
    arr.push(v);
    byGroup.set(v.groupId, arr);
  }

  // Partidos finalizados por grupo, para la mini-liga (head-to-head).
  const matchesByGroup = new Map<number, H2HMatch[]>();
  for (const m of groupMatches) {
    if (m.groupId == null || m.homeTeamId == null || m.awayTeamId == null) continue;
    if (m.homeScore == null || m.awayScore == null) continue;
    const arr = matchesByGroup.get(m.groupId) ?? [];
    arr.push({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
    });
    matchesByGroup.set(m.groupId, arr);
  }

  await db.transaction(async (tx) => {
    // Wipe TODA la tabla y reescribimos desde cero. Importante: si el admin
    // revierte el último partido finalizado de un grupo, ese grupo ya no
    // aparece en `byGroup`, así que un delete por-grupo dejaría sus filas
    // viejas intactas. Truncar primero garantiza que cualquier reversión
    // borra el estado obsoleto correspondiente.
    await tx.delete(groupStandings);

    for (const [groupId, arr] of byGroup) {
      const ranked = rankGroupStandings(arr, matchesByGroup.get(groupId) ?? []);
      for (let i = 0; i < ranked.length; i++) {
        const v = ranked[i];
        await tx.insert(groupStandings).values({
          groupId: v.groupId,
          teamId: v.teamId,
          position: i + 1,
          played: v.played,
          won: v.won,
          drawn: v.drawn,
          lost: v.lost,
          goalsFor: v.goalsFor,
          goalsAgainst: v.goalsAgainst,
          points: v.points,
          finalizedAt: new Date(),
        });
      }
    }
  });

  return { groupCount: byGroup.size };
}
