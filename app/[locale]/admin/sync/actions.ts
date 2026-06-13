"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchScorers, matches, pendingScorers, players } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { recomputeMatchScoringForAllUsers } from "@/lib/scoring/persistence";
import { computeFirstGoal } from "@/lib/automation/first-goal";
import { syncLiveMatches } from "@/lib/automation/match-sync";
import {
  populateR32ThirdPlaces,
  setR32TransitionState,
} from "@/lib/automation/third-place-population";

export type ActionResult = { ok: boolean; error?: string; message?: string };

/**
 * Gate de transición a R32: puebla las 8 casillas de mejores terceros vía
 * Anexo C y marca el R32 como abierto. Tras esto, las jornadas/bracket de R32
 * salen de "waiting" (los emparejamientos quedan resueltos). 1 clic del admin.
 */
export async function openR32Predictions(): Promise<ActionResult> {
  const me = await requireAdmin();
  const res = await populateR32ThirdPlaces();
  if (res.status !== "ok") {
    const error =
      res.status === "ambiguous"
        ? "Empate en el corte 8.º/9.º: resuélvelo en Operaciones › Mejores terceros antes de abrir."
        : res.status === "incomplete"
          ? "La fase de grupos aún no ha cerrado del todo."
          : "No hay una combinación válida de terceros (revisa las clasificaciones).";
    return { ok: false, error };
  }
  await setR32TransitionState({ openedAt: new Date().toISOString(), openedBy: me.id });
  await logAdminAction({ adminId: me.id, action: "ops.open_r32", payload: { changed: res.changed } });
  revalidatePath("/admin/sync");
  revalidatePath("/predicciones");
  revalidatePath("/predicciones/bracket");
  revalidatePath("/predicciones/jornada/[matchdayId]", "page");
  revalidatePath("/bracket");
  revalidatePath("/calendario");
  revalidatePath("/grupos/terceros");
  return { ok: true, message: `R32 abierto. ${res.changed.length} casillas de terceros ubicadas.` };
}

/** Dispara el sync a mano (mismo camino que el cron). */
export async function forceSyncNow(): Promise<ActionResult> {
  const me = await requireAdmin();
  try {
    const r = await syncLiveMatches();
    await logAdminAction({ adminId: me.id, action: "sync.force", payload: r });
    revalidatePath("/admin/sync");
    return { ok: true, message: `En ventana: ${r.windowCount} · cambiados: ${r.changed} · pendientes: ${r.pending} · errores: ${r.errors}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fallo el sync" };
  }
}

/** Bloquea (manual) o libera (auto) un partido frente al sync automático. */
export async function setResultSource(formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const matchId = Number(formData.get("matchId"));
  const source = String(formData.get("source"));
  if (!Number.isFinite(matchId) || (source !== "auto" && source !== "manual")) {
    return { ok: false, error: "Datos inválidos." };
  }
  await db.update(matches).set({ resultSource: source }).where(eq(matches.id, matchId));
  await logAdminAction({ adminId: me.id, action: "sync.source", payload: { matchId, source } });
  revalidatePath("/admin/sync");
  return { ok: true };
}

/**
 * Reconcilia un goleador en espera: lo asocia a un jugador nuestro, cachea
 * el provider_player_id, lo inserta en match_scorers (re-derivando primer
 * gol del partido) y re-puntúa ese partido. Borra la fila pendiente.
 */
export async function reconcileScorer(formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const pendingId = Number(formData.get("pendingId"));
  const playerId = Number(formData.get("playerId"));
  if (!Number.isFinite(pendingId) || !Number.isFinite(playerId)) {
    return { ok: false, error: "Datos inválidos." };
  }

  const [pend] = await db.select().from(pendingScorers).where(eq(pendingScorers.id, pendingId)).limit(1);
  if (!pend) return { ok: false, error: "El goleador pendiente ya no existe." };
  const [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  if (!player) return { ok: false, error: "Jugador no encontrado." };

  await db.transaction(async (tx) => {
    // Cachear el id del proveedor para futuros mapeos exactos.
    if (pend.providerPlayerId) {
      await tx.update(players).set({ providerPlayerId: pend.providerPlayerId }).where(eq(players.id, playerId));
    }
    await tx.insert(matchScorers).values({
      matchId: pend.matchId,
      playerId,
      teamId: player.teamId,
      minute: pend.minute,
      isFirstGoal: false, // se recalcula abajo
      isOwnGoal: pend.isOwnGoal,
      isPenalty: pend.isPenalty,
    });
    await tx.delete(pendingScorers).where(eq(pendingScorers.id, pendingId));

    // Re-derivar "primer gol" entre todos los goleadores del partido con la
    // lógica central (computeFirstGoal): el primer gol del partido contando
    // autogoles; si ese primer gol es en propia, nadie es primer goleador. Y
    // si AÚN quedan goleadores sin mapear de este partido, tampoco se adjudica
    // hasta resolverlos (uno temprano podría ser el verdadero primer gol).
    const all = await tx
      .select({ id: matchScorers.id, minute: matchScorers.minute, isOwnGoal: matchScorers.isOwnGoal })
      .from(matchScorers)
      .where(eq(matchScorers.matchId, pend.matchId));
    const stillPending = await tx
      .select({ minute: pendingScorers.minute })
      .from(pendingScorers)
      .where(eq(pendingScorers.matchId, pend.matchId));
    const flagged = computeFirstGoal(
      all.map((s) => ({
        id: s.id,
        playerId: 0,
        teamId: 0,
        minute: s.minute,
        isOwnGoal: s.isOwnGoal,
        isPenalty: false,
        isFirstGoal: false,
      })),
      stillPending.map((p) => p.minute),
    );
    for (const s of flagged) {
      await tx.update(matchScorers).set({ isFirstGoal: s.isFirstGoal }).where(eq(matchScorers.id, s.id));
    }
  });

  // Re-puntuar ese partido (idempotente).
  await recomputeMatchScoringForAllUsers(pend.matchId);
  await logAdminAction({ adminId: me.id, action: "sync.reconcile", payload: { pendingId, playerId, matchId: pend.matchId } });
  revalidatePath("/admin/sync");
  revalidatePath(`/partido/${pend.matchId}`);
  revalidatePath("/ranking");
  return { ok: true, message: "Goleador reconciliado y puntuado." };
}

/** Descarta un goleador en espera (p. ej. dato erróneo del proveedor). */
export async function dismissPending(formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const pendingId = Number(formData.get("pendingId"));
  if (!Number.isFinite(pendingId)) return { ok: false, error: "Datos inválidos." };
  await db.delete(pendingScorers).where(eq(pendingScorers.id, pendingId));
  await logAdminAction({ adminId: me.id, action: "sync.dismiss", payload: { pendingId } });
  revalidatePath("/admin/sync");
  return { ok: true };
}
