"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
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
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { getMatchdayState, isMatchClosed, type Stage } from "@/lib/matchday-state";
import { runAction } from "@/lib/actions/guard";

export type FormState = {
  ok: boolean;
  error?: string;
  /** Cuántas predicciones se ignoraron porque su partido ya empezó. */
  skipped?: number;
};

const schema = z.object({
  matchdayId: z.coerce.number().int(),
  predictions: z
    .array(
      z.object({
        matchId: z.coerce.number().int(),
        homeScore: z.coerce.number().int().min(0).max(40),
        awayScore: z.coerce.number().int().min(0).max(40),
        willGoToPens: z.coerce.boolean().default(false),
        winnerTeamId: z.coerce.number().int().optional().nullable(),
        scorerPlayerId: z.coerce.number().int().optional().nullable(),
        // Solo Ganador: ¿el usuario eligió 1/X/2? En completo/marcador no se
        // envía y por defecto es true (se guardan todos los marcadores).
        picked: z.coerce.boolean().optional().default(true),
      }),
    )
    .min(1),
});

export async function saveMatchdayPredictions(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { ok: false, error: "Datos malformados." };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // Enforce matchday state: must be open (predecessor stage finished + deadline future).
  const [day] = await db
    .select()
    .from(matchdays)
    .where(eq(matchdays.id, parsed.data.matchdayId))
    .limit(1);
  if (!day) return { ok: false, error: "Jornada no encontrada." };
  const status = await getMatchdayState({
    id: day.id,
    stage: day.stage as Stage,
  });
  if (status.state === "waiting") {
    return {
      ok: false,
      error: status.reason ?? "Esta jornada todavía no se ha desbloqueado.",
    };
  }
  if (status.state === "closed") {
    return {
      ok: false,
      error: "Todos los partidos de esta jornada ya empezaron — predicciones cerradas.",
    };
  }

  // Validate that all matches belong to this matchday and load their squads
  // so we can check that any picked scorer plays for one of the two teams.
  const matchRows = await db
    .select({
      id: matches.id,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      scheduledAt: matches.scheduledAt,
    })
    .from(matches)
    .where(eq(matches.matchdayId, parsed.data.matchdayId));
  const matchById = new Map(matchRows.map((m) => [m.id, m]));
  for (const p of parsed.data.predictions) {
    if (!matchById.has(p.matchId)) {
      return { ok: false, error: "Partido no pertenece a esta jornada." };
    }
  }

  // Cierre por partido: filtramos predicciones cuyo partido ya arrancó.
  // No rompemos el submit — el form ya deshabilita los inputs cerrados,
  // así que normalmente no llegan. Llegamos aquí solo por race condition
  // (partido empezó entre el render y el submit), y dropearlos en
  // silencio es la mejor UX. Devolvemos `skipped` para que el form
  // pueda enseñar un toast informativo si quiere.
  const now = new Date();
  const allPredictions = parsed.data.predictions;
  const openPredictions = allPredictions.filter((p) => {
    const m = matchById.get(p.matchId);
    return m ? !isMatchClosed(m, now) : false;
  });
  const skipped = allPredictions.length - openPredictions.length;
  if (openPredictions.length === 0) {
    return {
      ok: false,
      error: "Todos los partidos ya empezaron — no queda nada por guardar.",
      skipped,
    };
  }

  const scorerIds = openPredictions
    .map((p) => p.scorerPlayerId)
    .filter((id): id is number => typeof id === "number");
  const scorerRows =
    scorerIds.length > 0
      ? await db.select().from(players).where(inArray(players.id, scorerIds))
      : [];
  const scorerById = new Map(scorerRows.map((p) => [p.id, p]));
  for (const p of openPredictions) {
    if (p.scorerPlayerId == null) continue;
    const player = scorerById.get(p.scorerPlayerId);
    if (!player) {
      return { ok: false, error: "Jugador no encontrado." };
    }
    const m = matchById.get(p.matchId)!;
    if (player.teamId !== m.homeTeamId && player.teamId !== m.awayTeamId) {
      return { ok: false, error: "Ese jugador no juega este partido." };
    }
  }

  const leagueId = await currentLeagueId(me);
  if (leagueId == null) {
    return { ok: false, error: "Sin liga activa." };
  }
  // En Solo Ganador, un partido sin elegir queda como 0-0 (que codifica
  // "empate"); por eso NO lo guardamos a menos que el usuario lo haya
  // marcado. En completo/marcador `picked` llega como true y se guarda todo.
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  const onlyPicked = mode === "solo_ganador";

  return runAction(
    { action: "saveMatchdayPredictions", userId: me.id, leagueId },
    async () => {
      await db.transaction(async (tx) => {
        for (const p of openPredictions) {
          if (onlyPicked && !p.picked) continue;
          await tx
            .insert(predMatchResult)
            .values({
              userId: me.id,
              leagueId,
              matchId: p.matchId,
              homeScore: p.homeScore,
              awayScore: p.awayScore,
              willGoToPens: p.willGoToPens,
              winnerTeamId: p.winnerTeamId ?? null,
              submittedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [predMatchResult.userId, predMatchResult.leagueId, predMatchResult.matchId],
              set: {
                homeScore: p.homeScore,
                awayScore: p.awayScore,
                willGoToPens: p.willGoToPens,
                winnerTeamId: p.winnerTeamId ?? null,
                submittedAt: new Date(),
              },
            });

          if (p.scorerPlayerId == null) {
            await tx
              .delete(predMatchScorer)
              .where(
                and(
                  eq(predMatchScorer.userId, me.id),
                  eq(predMatchScorer.leagueId, leagueId),
                  eq(predMatchScorer.matchId, p.matchId),
                ),
              );
          } else {
            await tx
              .insert(predMatchScorer)
              .values({
                userId: me.id,
                leagueId,
                matchId: p.matchId,
                playerId: p.scorerPlayerId,
                submittedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: [predMatchScorer.userId, predMatchScorer.leagueId, predMatchScorer.matchId],
                set: {
                  playerId: p.scorerPlayerId,
                  submittedAt: new Date(),
                },
              });
          }
        }
      });

      revalidatePath(`/predicciones/jornada/${parsed.data.matchdayId}`);
      revalidatePath("/predicciones");
      revalidatePath("/dashboard");
      return { ok: true, skipped: skipped > 0 ? skipped : undefined };
    },
    (error) => ({ ok: false, error }),
  );
}
