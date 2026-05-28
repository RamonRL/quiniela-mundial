"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { predSpecial, specialPredictions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";
import { runAction } from "@/lib/actions/guard";
import { rateLimit } from "@/lib/ratelimit";

export type SaveSpecialResult = { ok: boolean; error?: string };

const schema = z.object({
  specialId: z.coerce.number().int(),
  valueJson: z.record(z.string(), z.unknown()),
});

/**
 * Auto-save de UNA respuesta especial desde el modo interactivo.
 *
 * NO llama revalidatePath — lo hace `endSpecialsTour()` al cerrar
 * el flow para no invalidar /predicciones N veces.
 */
export async function saveSpecialPrediction(
  input: z.infer<typeof schema>,
): Promise<SaveSpecialResult> {
  const me = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [def] = await db
    .select()
    .from(specialPredictions)
    .where(eq(specialPredictions.id, parsed.data.specialId))
    .limit(1);
  if (!def) return { ok: false, error: "Pregunta no encontrada." };
  if (new Date(def.closesAt).getTime() <= Date.now()) {
    return { ok: false, error: `"${def.question}" ya está cerrada.` };
  }

  const leagueId = await currentLeagueId(me);
  if (leagueId == null) return { ok: false, error: "Sin liga activa." };

  // Anti-abuso del autosave: bucket compartido de saves de predicción
  // (40 cada 10 s por usuario) — holgado para un usuario rápido, frena un
  // cliente en bucle.
  const limited = await rateLimit(`predsave:${me.id}`, 40, 10_000);
  if (!limited.ok) {
    return { ok: false, error: "Vas demasiado rápido. Espera unos segundos." };
  }

  // Si el valor está totalmente vacío, borramos la fila.
  const isEmpty =
    Object.keys(parsed.data.valueJson).length === 0 ||
    Object.values(parsed.data.valueJson).every((v) => v == null || v === "");

  return runAction(
    { action: "saveSpecialPrediction", userId: me.id, leagueId },
    async () => {
      // Transacción aunque sea una sola sentencia: mantiene el mismo patrón
      // que el resto de saves y deja sitio para crecer sin sorpresas.
      await db.transaction(async (tx) => {
        if (isEmpty) {
          await tx
            .delete(predSpecial)
            .where(
              and(
                eq(predSpecial.userId, me.id),
                eq(predSpecial.leagueId, leagueId),
                eq(predSpecial.specialId, parsed.data.specialId),
              ),
            );
          return;
        }

        await tx
          .insert(predSpecial)
          .values({
            userId: me.id,
            leagueId,
            specialId: parsed.data.specialId,
            valueJson: parsed.data.valueJson as unknown,
            submittedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [predSpecial.userId, predSpecial.leagueId, predSpecial.specialId],
            set: {
              valueJson: parsed.data.valueJson as unknown,
              submittedAt: new Date(),
            },
          });
      });

      return { ok: true };
    },
    (error) => ({ ok: false, error }),
  );
}

export async function endSpecialsTour(): Promise<void> {
  revalidatePath("/predicciones/especiales");
  revalidatePath("/predicciones");
  revalidatePath("/dashboard");
}
