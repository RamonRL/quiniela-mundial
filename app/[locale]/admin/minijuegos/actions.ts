"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, max, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { minigameScores } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { MINIGAMES } from "@/app/[locale]/(public)/minijuegos/_lib/games";

export type FormState = { ok: boolean; error?: string; message?: string };

export type GameOverview = {
  gameKey: string;
  totalParticipants: number;
  totalGuests: number;
  bestScore: number | null;
  bestDisplayName: string | null;
  lastPlayedAt: Date | null;
};

export type AdminScoreRow = {
  id: number;
  identityKey: string;
  displayName: string;
  bestScore: number;
  playedAt: Date;
  isGuest: boolean;
};

/**
 * Resumen agregado por juego. Lo hacemos en una sola pasada con SQL
 * estándar (no Postgres-specific) para no añadir queries por cada minijuego
 * registrado en el catálogo.
 */
export async function loadOverview(): Promise<GameOverview[]> {
  await requireAdmin();
  const stats = await db
    .select({
      gameKey: minigameScores.gameKey,
      totalParticipants: sql<number>`COUNT(*)::int`,
      totalGuests: sql<number>`COUNT(*) FILTER (WHERE ${minigameScores.userId} IS NULL)::int`,
      bestScore: max(minigameScores.bestScore),
      lastPlayedAt: max(minigameScores.playedAt),
    })
    .from(minigameScores)
    .groupBy(minigameScores.gameKey);

  const statsByGame = new Map(stats.map((s) => [s.gameKey, s]));

  // Para cada juego conocido en el catálogo (incluyendo "soon" sin filas),
  // construimos el overview. Si tiene best, traemos también quién lo ostenta.
  const overviews: GameOverview[] = [];
  for (const game of MINIGAMES) {
    const s = statsByGame.get(game.gameKey);
    if (!s) {
      overviews.push({
        gameKey: game.gameKey,
        totalParticipants: 0,
        totalGuests: 0,
        bestScore: null,
        bestDisplayName: null,
        lastPlayedAt: null,
      });
      continue;
    }
    const [topRow] = await db
      .select({ displayName: minigameScores.displayName })
      .from(minigameScores)
      .where(
        and(
          eq(minigameScores.gameKey, game.gameKey),
          eq(minigameScores.bestScore, s.bestScore!),
        ),
      )
      .orderBy(minigameScores.playedAt)
      .limit(1);
    overviews.push({
      gameKey: game.gameKey,
      totalParticipants: s.totalParticipants,
      totalGuests: s.totalGuests,
      bestScore: s.bestScore,
      bestDisplayName: topRow?.displayName ?? null,
      lastPlayedAt: s.lastPlayedAt,
    });
  }
  return overviews;
}

export async function loadGameScores(
  gameKey: string,
  limit = 25,
): Promise<AdminScoreRow[]> {
  await requireAdmin();
  const rows = await db
    .select({
      id: minigameScores.id,
      identityKey: minigameScores.identityKey,
      displayName: minigameScores.displayName,
      bestScore: minigameScores.bestScore,
      playedAt: minigameScores.playedAt,
      userId: minigameScores.userId,
    })
    .from(minigameScores)
    .where(eq(minigameScores.gameKey, gameKey))
    .orderBy(desc(minigameScores.bestScore), minigameScores.playedAt)
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    identityKey: r.identityKey,
    displayName: r.displayName,
    bestScore: r.bestScore,
    playedAt: r.playedAt,
    isGuest: r.userId == null,
  }));
}

/**
 * Elimina una fila concreta del ranking. Útil para limpiar apodos abusivos
 * o entradas de invitados que han hecho trampa.
 */
export async function deleteScore(scoreId: number): Promise<FormState> {
  const me = await requireAdmin();
  if (!Number.isFinite(scoreId)) return { ok: false, error: "ID inválido." };
  const [deleted] = await db
    .delete(minigameScores)
    .where(eq(minigameScores.id, scoreId))
    .returning();
  if (!deleted) return { ok: false, error: "No se encontró esa puntuación." };
  await logAdminAction({
    adminId: me.id,
    action: "minigames.delete_score",
    payload: {
      gameKey: deleted.gameKey,
      identityKey: deleted.identityKey,
      displayName: deleted.displayName,
      bestScore: deleted.bestScore,
    },
  });
  revalidatePath("/minijuegos");
  revalidatePath(`/minijuegos/${deleted.gameKey}`);
  revalidatePath("/admin/minijuegos");
  return {
    ok: true,
    message: `Borrada la puntuación de ${deleted.displayName} (${deleted.bestScore} pts).`,
  };
}

/** Borra todas las puntuaciones de un juego concreto. */
export async function resetGame(gameKey: string): Promise<FormState> {
  const me = await requireAdmin();
  if (!MINIGAMES.some((g) => g.gameKey === gameKey)) {
    return { ok: false, error: "Juego desconocido." };
  }
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(minigameScores)
    .where(eq(minigameScores.gameKey, gameKey));
  await db.delete(minigameScores).where(eq(minigameScores.gameKey, gameKey));
  await logAdminAction({
    adminId: me.id,
    action: "minigames.reset_game",
    payload: { gameKey, wiped: count },
  });
  revalidatePath("/minijuegos");
  revalidatePath(`/minijuegos/${gameKey}`);
  revalidatePath("/admin/minijuegos");
  return {
    ok: true,
    message: `Borradas ${count} puntuaciones de ${gameKey}.`,
  };
}

/** Borra TODAS las puntuaciones de TODOS los minijuegos. */
export async function resetAllMinigames(): Promise<FormState> {
  const me = await requireAdmin();
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(minigameScores);
  await db.delete(minigameScores);
  await logAdminAction({
    adminId: me.id,
    action: "minigames.reset_all",
    payload: { wiped: count },
  });
  revalidatePath("/minijuegos");
  revalidatePath("/admin/minijuegos");
  // Revalidar todas las páginas de minijuegos conocidos (por si quedaba
  // cache de ranking ya pintado).
  for (const g of MINIGAMES) {
    revalidatePath(`/minijuegos/${g.slug}`);
  }
  return {
    ok: true,
    message: `Borradas ${count} puntuaciones en total.`,
  };
}

/**
 * Permite borrar varias filas seleccionadas a la vez (útil para limpiar
 * varios apodos a la vez sin un click por uno). Acepta hasta 50 IDs por
 * seguridad.
 */
export async function deleteScores(scoreIds: number[]): Promise<FormState> {
  const me = await requireAdmin();
  const ids = scoreIds.filter((n) => Number.isInteger(n) && n > 0).slice(0, 50);
  if (ids.length === 0) return { ok: false, error: "Sin filas seleccionadas." };
  const deleted = await db
    .delete(minigameScores)
    .where(inArray(minigameScores.id, ids))
    .returning({ gameKey: minigameScores.gameKey });
  await logAdminAction({
    adminId: me.id,
    action: "minigames.delete_scores_bulk",
    payload: { ids, count: deleted.length },
  });
  const affectedGames = new Set(deleted.map((d) => d.gameKey));
  revalidatePath("/minijuegos");
  revalidatePath("/admin/minijuegos");
  for (const g of affectedGames) revalidatePath(`/minijuegos/${g}`);
  return { ok: true, message: `${deleted.length} puntuaciones borradas.` };
}
