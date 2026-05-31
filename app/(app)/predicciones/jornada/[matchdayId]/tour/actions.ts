"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  matchdays,
  matches,
  players,
  predMatchResult,
  predMatchScorer,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";
import { getMatchdayState, isMatchClosed, type Stage } from "@/lib/matchday-state";
import { runAction } from "@/lib/actions/guard";
import { rateLimit } from "@/lib/ratelimit";

export type SaveMatchResult = { ok: boolean; error?: string };

const schema = z.object({
  matchId: z.coerce.number().int(),
  homeScore: z.coerce.number().int().min(0).max(40),
  awayScore: z.coerce.number().int().min(0).max(40),
  willGoToPens: z.coerce.boolean().default(false),
  winnerTeamId: z.coerce.number().int().nullable().optional(),
  // Goleador: obligatorio solo en modo completo. En marcador / solo_ganador
  // no existe, así que el cliente lo manda null.
  scorerPlayerId: z.coerce.number().int().nullable().optional(),
});

/**
 * Auto-save de UN partido desde el modo interactivo. Valida que el
 * partido no esté ya cerrado y que el goleador juega en ese partido.
 *
 * NO llama revalidatePath — eso lo hace `endMatchdayTour()` al
 * cerrar el flow para no invalidar /predicciones N veces.
 */
export async function saveMatchPrediction(
  input: z.infer<typeof schema>,
): Promise<SaveMatchResult> {
  const me = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [m] = await db
    .select({
      id: matches.id,
      matchdayId: matches.matchdayId,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      scheduledAt: matches.scheduledAt,
    })
    .from(matches)
    .where(eq(matches.id, parsed.data.matchId))
    .limit(1);
  if (!m) return { ok: false, error: "Partido no encontrado." };
  if (isMatchClosed(m)) {
    return { ok: false, error: "Este partido ya empezó." };
  }

  // Estado de la jornada (waiting / closed bloquean).
  if (m.matchdayId != null) {
    const [day] = await db
      .select()
      .from(matchdays)
      .where(eq(matchdays.id, m.matchdayId))
      .limit(1);
    if (day) {
      const status = await getMatchdayState({ id: day.id, stage: day.stage as Stage });
      if (status.state !== "open") {
        return { ok: false, error: status.reason ?? "Jornada cerrada." };
      }
    }
  }

  // Goleador (solo modo completo): si viene, debe jugar en este partido.
  const scorerPlayerId = parsed.data.scorerPlayerId ?? null;
  if (scorerPlayerId != null) {
    const [scorer] = await db
      .select({ id: players.id, teamId: players.teamId })
      .from(players)
      .where(eq(players.id, scorerPlayerId))
      .limit(1);
    if (!scorer) return { ok: false, error: "Goleador no encontrado." };
    if (scorer.teamId !== m.homeTeamId && scorer.teamId !== m.awayTeamId) {
      return { ok: false, error: "Ese jugador no juega este partido." };
    }
  }

  const leagueId = await currentLeagueId(me);
  if (leagueId == null) return { ok: false, error: "Sin liga activa." };

  // Anti-abuso del autosave: bucket compartido de saves de predicción.
  const limited = await rateLimit(`predsave:${me.id}`, 40, 10_000);
  if (!limited.ok) {
    return { ok: false, error: "Vas demasiado rápido. Espera unos segundos." };
  }

  return runAction(
    { action: "saveMatchPrediction", userId: me.id, leagueId },
    async () => {
      await db.transaction(async (tx) => {
        await tx
          .insert(predMatchResult)
          .values({
            userId: me.id,
            leagueId,
            matchId: parsed.data.matchId,
            homeScore: parsed.data.homeScore,
            awayScore: parsed.data.awayScore,
            willGoToPens: parsed.data.willGoToPens,
            winnerTeamId: parsed.data.winnerTeamId ?? null,
            submittedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [predMatchResult.userId, predMatchResult.leagueId, predMatchResult.matchId],
            set: {
              homeScore: parsed.data.homeScore,
              awayScore: parsed.data.awayScore,
              willGoToPens: parsed.data.willGoToPens,
              winnerTeamId: parsed.data.winnerTeamId ?? null,
              submittedAt: new Date(),
            },
          });

        if (scorerPlayerId != null) {
          await tx
            .insert(predMatchScorer)
            .values({
              userId: me.id,
              leagueId,
              matchId: parsed.data.matchId,
              playerId: scorerPlayerId,
              submittedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [predMatchScorer.userId, predMatchScorer.leagueId, predMatchScorer.matchId],
              set: {
                playerId: scorerPlayerId,
                submittedAt: new Date(),
              },
            });
        } else {
          // Sin goleador (marcador / solo_ganador): limpiamos cualquier pick
          // previo por si la liga cambió de modo o venía de un import.
          await tx
            .delete(predMatchScorer)
            .where(
              and(
                eq(predMatchScorer.userId, me.id),
                eq(predMatchScorer.leagueId, leagueId),
                eq(predMatchScorer.matchId, parsed.data.matchId),
              ),
            );
        }
      });

      return { ok: true };
    },
    (error) => ({ ok: false, error }),
  );
}

/**
 * Cierre del tour de jornada. Revalida los paths afectados de golpe.
 */
export async function endMatchdayTour(matchdayId: number): Promise<void> {
  revalidatePath(`/predicciones/jornada/${matchdayId}`);
  revalidatePath("/predicciones");
  revalidatePath("/dashboard");
}
