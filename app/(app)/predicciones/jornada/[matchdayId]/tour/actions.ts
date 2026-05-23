"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
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

export type SaveMatchResult = { ok: boolean; error?: string };

const schema = z.object({
  matchId: z.coerce.number().int(),
  homeScore: z.coerce.number().int().min(0).max(40),
  awayScore: z.coerce.number().int().min(0).max(40),
  willGoToPens: z.coerce.boolean().default(false),
  winnerTeamId: z.coerce.number().int().nullable().optional(),
  scorerPlayerId: z.coerce.number().int(),
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

  // Goleador: debe pertenecer a uno de los dos equipos del partido.
  const [scorer] = await db
    .select({ id: players.id, teamId: players.teamId })
    .from(players)
    .where(eq(players.id, parsed.data.scorerPlayerId))
    .limit(1);
  if (!scorer) return { ok: false, error: "Goleador no encontrado." };
  if (scorer.teamId !== m.homeTeamId && scorer.teamId !== m.awayTeamId) {
    return { ok: false, error: "Ese jugador no juega este partido." };
  }

  const leagueId = await currentLeagueId(me);
  if (leagueId == null) return { ok: false, error: "Sin liga activa." };

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

    await tx
      .insert(predMatchScorer)
      .values({
        userId: me.id,
        leagueId,
        matchId: parsed.data.matchId,
        playerId: parsed.data.scorerPlayerId,
        submittedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [predMatchScorer.userId, predMatchScorer.leagueId, predMatchScorer.matchId],
        set: {
          playerId: parsed.data.scorerPlayerId,
          submittedAt: new Date(),
        },
      });
  });

  return { ok: true };
}

/**
 * Cierre del tour de jornada. Revalida los paths afectados de golpe.
 */
export async function endMatchdayTour(matchdayId: number): Promise<void> {
  revalidatePath(`/predicciones/jornada/${matchdayId}`);
  revalidatePath("/predicciones");
  revalidatePath("/dashboard");
}
