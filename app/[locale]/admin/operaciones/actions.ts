"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groupStandings,
  matchScorers,
  matches,
  pointsLedger,
  specialPredictions,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { recomputeAllGroupStandings } from "@/lib/scoring/group-standings";
import {
  recomputeAllScoring,
  recomputeBracketStageForAllUsers,
  recomputeGroupScoringForAllUsers,
  recomputeMatchScoringForAllUsers,
  recomputeSpecialPredictionForAllUsers,
  recomputeTopScorerForAllUsers,
} from "@/lib/scoring/persistence";
import { evaluateAutoSpecials } from "@/lib/automation/specials-auto";

export type FormState = { ok: boolean; error?: string; message?: string };

// ─────────────────────── Recalcular por sección ───────────────────────

/** Re-aplica el scoring por partido a TODOS los partidos finalizados. */
export async function recomputeMatches(): Promise<FormState> {
  const me = await requireAdmin();
  const finishedRows = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.status, "finished"));
  for (const m of finishedRows) {
    await recomputeMatchScoringForAllUsers(m.id);
  }
  await logAdminAction({
    adminId: me.id,
    action: "ops.recompute_matches",
    payload: { count: finishedRows.length },
  });
  revalidatePath("/ranking");
  return { ok: true, message: `Puntuación de ${finishedRows.length} partidos recalculada.` };
}

/**
 * Recompute del bloque de grupos: clasificación + cat 1 (posiciones) por
 * cada grupo con standings ya generados.
 */
export async function recomputeGroups(): Promise<FormState> {
  const me = await requireAdmin();
  const { groupCount } = await recomputeAllGroupStandings();
  const groupRows = await db
    .selectDistinct({ groupId: groupStandings.groupId })
    .from(groupStandings);
  for (const { groupId } of groupRows) {
    await recomputeGroupScoringForAllUsers(groupId);
  }
  await logAdminAction({
    adminId: me.id,
    action: "ops.recompute_groups",
    payload: { groupCount },
  });
  revalidatePath("/grupos");
  revalidatePath("/grupos/[code]", "page");
  revalidatePath("/ranking");
  return { ok: true, message: `Clasificación + cat 1 recalculados (${groupCount} grupos).` };
}

/**
 * Recompute incremental del bracket (cat 2) por cada stage KO con partidos
 * finalizados.
 */
export async function recomputeBracket(): Promise<FormState> {
  const me = await requireAdmin();
  const stageMap: { src: "r32" | "r16" | "qf" | "sf" | "final"; key: "r16" | "qf" | "sf" | "final" | "champion" }[] = [
    { src: "r32", key: "r16" },
    { src: "r16", key: "qf" },
    { src: "qf", key: "sf" },
    { src: "sf", key: "final" },
    { src: "final", key: "champion" },
  ];
  for (const { src, key } of stageMap) {
    const rows = await db
      .select({ winnerTeamId: matches.winnerTeamId })
      .from(matches)
      .where(and(eq(matches.stage, src), eq(matches.status, "finished")));
    const winners = rows
      .map((r) => r.winnerTeamId)
      .filter((x): x is number => x != null);
    await recomputeBracketStageForAllUsers(key, winners);
  }
  await logAdminAction({ adminId: me.id, action: "ops.recompute_bracket" });
  revalidatePath("/ranking");
  return { ok: true, message: "Puntuación del bracket recalculada." };
}

/**
 * Bota de Oro (cat 3): deriva ranking de goleadores desde match_scorers
 * (excluye en propia) y reparte puntos.
 */
export async function recomputeTopScorer(): Promise<FormState> {
  const me = await requireAdmin();
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
  if (ranking.length === 0) {
    return { ok: false, error: "Sin goleadores registrados." };
  }
  await recomputeTopScorerForAllUsers(ranking);
  await logAdminAction({
    adminId: me.id,
    action: "ops.recompute_top_scorer",
    payload: { winnerPlayerId: ranking[0] },
  });
  revalidatePath("/ranking");
  revalidatePath("/goleadores");
  return {
    ok: true,
    message: `Bota de Oro recalculada. Líder: jugador #${ranking[0]} con ${rows[0].goals} goles.`,
  };
}

/**
 * Re-evalúa las reglas auto de los specials y luego recompute para todos.
 * Los `best_*` (resueltos a mano) no se tocan.
 */
export async function recomputeSpecials(): Promise<FormState> {
  const me = await requireAdmin();
  const { resolvedIds } = await evaluateAutoSpecials();
  // Para todos los specials (auto-resueltos o no), recompute scoring por
  // si las reglas o respuestas cambiaron.
  const all = await db.select({ id: specialPredictions.id }).from(specialPredictions);
  for (const s of all) {
    await recomputeSpecialPredictionForAllUsers(s.id);
  }
  await logAdminAction({
    adminId: me.id,
    action: "ops.recompute_specials",
    payload: { newlyResolved: resolvedIds.length },
  });
  revalidatePath("/predicciones/especiales");
  revalidatePath("/admin/especiales");
  revalidatePath("/ranking");
  return {
    ok: true,
    message:
      resolvedIds.length > 0
        ? `Specials recalculados (${resolvedIds.length} nuevas resoluciones automáticas).`
        : "Specials recalculados.",
  };
}

export async function recomputeEverything(): Promise<FormState> {
  const me = await requireAdmin();
  await recomputeAllScoring();
  await logAdminAction({ adminId: me.id, action: "ops.recompute_all" });
  revalidatePath("/ranking");
  return { ok: true, message: "Recalculado todo el sistema de puntos." };
}

// ─────────────────────── Resets destructivos ───────────────────────

export async function resetAllPoints(): Promise<FormState> {
  const me = await requireAdmin();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pointsLedger);
  await db.delete(pointsLedger);
  await logAdminAction({
    adminId: me.id,
    action: "ops.reset_all_points",
    payload: { wiped: count },
  });
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: `Puntuaciones a cero. ${count} entradas borradas del ledger.`,
  };
}

export async function resetGroupStage(): Promise<FormState> {
  const me = await requireAdmin();
  const [{ standingsCount }] = await db
    .select({ standingsCount: sql<number>`count(*)::int` })
    .from(groupStandings);
  const [{ ledgerCount }] = await db
    .select({ ledgerCount: sql<number>`count(*)::int` })
    .from(pointsLedger)
    .where(inArray(pointsLedger.source, ["group_position", "group_top2_swap"]));

  await db.delete(groupStandings);
  await db
    .delete(pointsLedger)
    .where(inArray(pointsLedger.source, ["group_position", "group_top2_swap"]));

  await logAdminAction({
    adminId: me.id,
    action: "ops.reset_group_stage",
    payload: { standingsWiped: standingsCount, ledgerWiped: ledgerCount },
  });
  revalidatePath("/grupos");
  revalidatePath("/grupos/[code]", "page");
  revalidatePath("/ranking");
  return {
    ok: true,
    message: `Fase de grupos a cero. ${standingsCount} filas de clasificación y ${ledgerCount} entradas de puntos borradas.`,
  };
}
