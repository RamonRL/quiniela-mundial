"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { predTournamentTopScorer } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { runAction } from "@/lib/actions/guard";

export type FormState = { ok: boolean; error?: string };

const KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

const schema = z.object({ playerId: z.coerce.number().int() });

export async function saveTopScorerPrediction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const parsed = schema.safeParse({ playerId: formData.get("playerId") });
  if (!parsed.success) return { ok: false, error: "Selecciona un jugador." };
  if (KICKOFF.getTime() <= Date.now()) {
    return { ok: false, error: "El torneo ya empezó." };
  }
  const leagueId = await currentLeagueId(me);
  if (leagueId == null) {
    return { ok: false, error: "Sin liga activa." };
  }
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  if (mode !== "completo") {
    return { ok: false, error: "Esta quiniela no predice goleador." };
  }
  return runAction(
    { action: "saveTopScorerPrediction", userId: me.id, leagueId },
    async () => {
      await db
        .insert(predTournamentTopScorer)
        .values({
          userId: me.id,
          leagueId,
          playerId: parsed.data.playerId,
          submittedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [predTournamentTopScorer.userId, predTournamentTopScorer.leagueId],
          set: { playerId: parsed.data.playerId, submittedAt: new Date() },
        });
      revalidatePath("/predicciones/goleador-torneo");
      revalidatePath("/predicciones");
      return { ok: true };
    },
    (error) => ({ ok: false, error }),
  );
}
