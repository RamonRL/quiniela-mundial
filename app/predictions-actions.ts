"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";
import {
  getPickCountsByLeague,
  importPredictionsBetweenLeagues,
} from "@/lib/import-predictions";

export type ImportFormState = {
  ok: boolean;
  error?: string;
  message?: string;
};

const schema = z.object({ sourceLeagueId: z.coerce.number().int() });

export async function importPredictionsAction(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const me = await requireUser();
  const targetLeagueId = await currentLeagueId(me);
  if (targetLeagueId == null) {
    return { ok: false, error: "Sin liga activa." };
  }
  const parsed = schema.safeParse({
    sourceLeagueId: formData.get("sourceLeagueId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Liga origen inválida." };
  }
  if (parsed.data.sourceLeagueId === targetLeagueId) {
    return { ok: false, error: "Origen y destino no pueden ser la misma liga." };
  }

  try {
    const stats = await importPredictionsBetweenLeagues({
      userId: me.id,
      sourceLeagueId: parsed.data.sourceLeagueId,
      targetLeagueId,
    });
    const total =
      stats.groupRankings +
      stats.bracket +
      stats.topScorer +
      stats.matchResults +
      stats.matchScorers +
      stats.specials;
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `Importadas ${total} picks (${stats.groupRankings} grupos · ${stats.bracket} bracket · ${stats.matchResults} marcadores · ${stats.matchScorers} goleadores · ${stats.topScorer} bota de oro · ${stats.specials} especiales).`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al importar.",
    };
  }
}

const copySchema = z.object({
  sourceLeagueId: z.coerce.number().int(),
  targetLeagueId: z.coerce.number().int(),
});

/**
 * Variante del import pensada para la sección "Mis quinielas" del perfil:
 * el usuario elige tanto el origen como el destino (no se asume la liga
 * activa), pero se enforza que el origen tenga ESTRICTAMENTE más picks que
 * el destino — la restricción que el usuario pidió para no perder progreso.
 *
 * Aun así, la copia subyacente usa `onConflictDoNothing()` y solo rellena
 * huecos: nunca machaca una predicción existente del destino. La regla
 * "origen > destino" es la guarda explícita anti-error en el UI.
 */
export async function copyPredictionsBetweenLeaguesAction(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const me = await requireUser();
  const parsed = copySchema.safeParse({
    sourceLeagueId: formData.get("sourceLeagueId"),
    targetLeagueId: formData.get("targetLeagueId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { sourceLeagueId, targetLeagueId } = parsed.data;
  if (sourceLeagueId === targetLeagueId) {
    return { ok: false, error: "Origen y destino no pueden ser la misma liga." };
  }

  // Regla explícita: el origen debe tener más picks que el destino. Evita el
  // "copia inversa" donde el usuario podría confundirse y, aunque no perdería
  // datos (rellenamos solo huecos), tampoco aportaría nada.
  const counts = await getPickCountsByLeague(me.id);
  const sourceCount = counts.get(sourceLeagueId) ?? 0;
  const targetCount = counts.get(targetLeagueId) ?? 0;
  if (sourceCount <= targetCount) {
    return {
      ok: false,
      error:
        "Solo se puede copiar desde una liga con MÁS predicciones que el destino. Edita tus picks en la otra liga si quieres replicarlas.",
    };
  }

  try {
    const stats = await importPredictionsBetweenLeagues({
      userId: me.id,
      sourceLeagueId,
      targetLeagueId,
    });
    const total =
      stats.groupRankings +
      stats.bracket +
      stats.topScorer +
      stats.matchResults +
      stats.matchScorers +
      stats.specials;
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: total
        ? `Copiadas ${total} picks que faltaban (${stats.groupRankings} grupos · ${stats.bracket} bracket · ${stats.matchResults} marcadores · ${stats.matchScorers} goleadores · ${stats.topScorer} bota de oro · ${stats.specials} especiales).`
        : "Esta liga ya tenía rellenas todas las predicciones que estaban en la otra (no se copió ninguna nueva).",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al copiar.",
    };
  }
}
