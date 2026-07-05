import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchScorers, matches } from "@/lib/db/schema";
import {
  recomputeBracketStageForAllUsers,
  recomputeGroupScoringForAllUsers,
  recomputeSpecialPredictionForAllUsers,
  recomputeTopScorerForAllUsers,
} from "@/lib/scoring/persistence";
import type { BracketStageKey } from "@/lib/scoring";
import {
  cascadeKoWinner,
  clearKoCascade,
  isGroupComplete,
  isGroupStageComplete,
  populateR32FromGroup,
} from "./bracket-population";
import { autoMapNewFixtures } from "./auto-map";
import { clearAutoResolvedSpecials, evaluateAutoSpecials } from "./specials-auto";
import {
  handleGroupStageTransition,
  isR32Open,
  setR32TransitionState,
} from "./third-place-population";

/**
 * Orquestador post-partido.
 *
 * `onMatchFinalized(matchId)` se llama después de que `saveMatchResult`
 * persista el match finalizado. Encadena:
 *  1. Si stage='group': si el grupo cerró (6/6), populate R32 + score cat 1
 *     de ese grupo.
 *  2. Si stage es KO: cascade winner (y loser para el 3.º) hacia siguiente.
 *     Recompute cat 2 incrementalmente (`recomputeBracketStageForAllUsers`).
 *     Si stage='final': bota de oro (cat 3) + champion stage.
 *  3. Re-evalúa todos los specials auto (delegado en specials-auto).
 *
 * `onMatchReverted(matchId)` simétrico:
 *  - Si stage es KO: limpia downstream home/away vía clearKoCascade.
 *  - Limpia los auto-resolved specials (volverán a resolverse cuando la
 *    condición se cumpla otra vez).
 *  - Recompute KO stages (con winners actuales) para que los puntos
 *    bracket cuadren con el nuevo estado.
 *  - Si stage='group': si dejó de estar completo, no tocamos los R32 que ya
 *    estaban (el admin puede revertir y volver a finalizar; mientras tanto
 *    el bracket sigue mostrando lo que escribimos antes). Si quieres
 *    limpiar también, descomenta más abajo.
 */
export async function onMatchFinalized(matchId: number): Promise<void> {
  const [m] = await db
    .select({
      id: matches.id,
      stage: matches.stage,
      groupId: matches.groupId,
    })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!m) return;

  // ── Group → group close (live cat 1 + populate R32 top-2) ─────────────
  if (m.stage === "group" && m.groupId != null) {
    const complete = await isGroupComplete(m.groupId);
    if (complete) {
      await populateR32FromGroup(m.groupId);
      await recomputeGroupScoringForAllUsers(m.groupId);
      // Los R32 cuyos dos grupos ya cerraron tienen ambos equipos → mapea su
      // fixture del proveedor para que el sync en vivo los recoja solo.
      await autoMapNewFixtures();
    }
    // Si cerró toda la fase de grupos, avisa de la transición a R32 (no abre
    // nada: la apertura es un clic del admin). Los mejores terceros NO se
    // poblan aquí — solo al confirmar.
    await handleGroupStageTransition();
  }

  // ── KO cascade + bracket scoring incremental ─────────────────────────
  if (m.stage !== "group") {
    await cascadeKoWinner(matchId);
    // La ronda siguiente acaba de recibir un equipo por cascada. Cuando sus dos
    // clasificados estén, el partido tendrá ambos equipos y se auto-mapeará su
    // fixture del proveedor (octavos, cuartos, semis, final) — así no hay que
    // meter resultados a mano nunca más.
    await autoMapNewFixtures();
    const stageKey = nextBracketStageKey(m.stage);
    if (stageKey) {
      const advancers = await loadStageWinners(m.stage);
      await recomputeBracketStageForAllUsers(stageKey, advancers);
    }
    if (m.stage === "final") {
      // Champion = ganador del partido de la final.
      const [finalRow] = await db
        .select({ winnerTeamId: matches.winnerTeamId })
        .from(matches)
        .where(eq(matches.id, matchId))
        .limit(1);
      if (finalRow?.winnerTeamId != null) {
        await recomputeBracketStageForAllUsers("champion", [finalRow.winnerTeamId]);
      }
      // Bota de oro: ranking de goleadores (excluye own goals).
      await scoreTopScorerNow();
    }
  }

  // ── Specials auto-resolve ────────────────────────────────────────────
  const { resolvedIds } = await evaluateAutoSpecials();
  for (const id of resolvedIds) {
    await recomputeSpecialPredictionForAllUsers(id);
  }
}

export async function onMatchReverted(matchId: number): Promise<void> {
  const [m] = await db
    .select({ id: matches.id, stage: matches.stage })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!m) return;

  if (m.stage !== "group") {
    await clearKoCascade(matchId);
    // Recompute bracket stages con los winners actuales.
    const stageKey = nextBracketStageKey(m.stage);
    if (stageKey) {
      const advancers = await loadStageWinners(m.stage);
      await recomputeBracketStageForAllUsers(stageKey, advancers);
    }
  } else {
    // Revertir un partido de grupo puede reabrir la fase. Si ya no está
    // completa y el R32 aún no se abrió, resetea el aviso de transición para
    // que vuelva a dispararse cuando se cierre de nuevo. Si ya estaba abierto,
    // re-evalúa (avisará si los terceros han cambiado).
    if (!(await isGroupStageComplete()) && !(await isR32Open())) {
      await setR32TransitionState({ notifiedAt: undefined, ambiguousNotifiedAt: undefined });
    } else {
      await handleGroupStageTransition();
    }
  }

  // Limpia auto-resolved specials y deja que vuelvan a evaluarse.
  const cleared = await clearAutoResolvedSpecials();
  for (const id of cleared) {
    await recomputeSpecialPredictionForAllUsers(id);
  }
  const { resolvedIds } = await evaluateAutoSpecials();
  for (const id of resolvedIds) {
    await recomputeSpecialPredictionForAllUsers(id);
  }
}

// ─────────────────────────── helpers ───────────────────────────

function nextBracketStageKey(
  stage: typeof matches.$inferSelect.stage,
): BracketStageKey | null {
  switch (stage) {
    case "r32":
      return "r16";
    case "r16":
      return "qf";
    case "qf":
      return "sf";
    case "sf":
      return "final";
    case "final":
      return "champion";
    default:
      return null;
  }
}

async function loadStageWinners(
  stage: typeof matches.$inferSelect.stage,
): Promise<number[]> {
  const rows = await db
    .select({ winnerTeamId: matches.winnerTeamId })
    .from(matches)
    .where(and(eq(matches.stage, stage), eq(matches.status, "finished")));
  return rows.map((r) => r.winnerTeamId).filter((x): x is number => x != null);
}

async function scoreTopScorerNow(): Promise<void> {
  const rows = await db
    .select({
      playerId: matchScorers.playerId,
      goals: sql<number>`count(*)::int`,
    })
    .from(matchScorers)
    .where(eq(matchScorers.isOwnGoal, false))
    .groupBy(matchScorers.playerId)
    .orderBy(sql`count(*) desc, ${matchScorers.playerId} asc`);
  const ranking = rows.map((r) => r.playerId);
  if (ranking.length === 0) return;
  await recomputeTopScorerForAllUsers(ranking);
}
