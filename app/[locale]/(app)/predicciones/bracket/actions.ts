"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { predBracketSlot } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { runAction } from "@/lib/actions/guard";

export type FormState = { ok: boolean; error?: string };

const KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

const stageEnum = z.enum(["r16", "qf", "sf", "final"]);

const schema = z.object({
  picks: z.object({
    r16: z.array(z.coerce.number().int()),
    qf: z.array(z.coerce.number().int()),
    sf: z.array(z.coerce.number().int()),
    finalists: z.array(z.coerce.number().int()),
    championTeamId: z.coerce.number().int().nullable(),
    thirdTeamId: z.coerce.number().int().nullable().optional(),
  }),
});

const STAGE_LIMIT: Record<z.infer<typeof stageEnum>, number> = {
  r16: 16,
  qf: 8,
  sf: 4,
  final: 2,
};

export async function saveBracketPicks(
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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  if (KICKOFF.getTime() <= Date.now()) {
    return { ok: false, error: "El torneo ya empezó. Bracket cerrado." };
  }

  const { r16, qf, sf, finalists, championTeamId, thirdTeamId } = parsed.data.picks;
  for (const [name, len, max] of [
    ["r16", r16.length, STAGE_LIMIT.r16],
    ["qf", qf.length, STAGE_LIMIT.qf],
    ["sf", sf.length, STAGE_LIMIT.sf],
    ["final", finalists.length, STAGE_LIMIT.final],
  ] as const) {
    if (len > max) {
      return { ok: false, error: `Máximo ${max} picks en ${name}.` };
    }
  }

  const leagueId = await currentLeagueId(me);
  if (leagueId == null) {
    return { ok: false, error: "Sin liga activa." };
  }
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  if (mode !== "completo") {
    return { ok: false, error: "Esta quiniela no predice el bracket." };
  }

  return runAction(
    { action: "saveBracketPicks", userId: me.id, leagueId },
    async () => {
      await db.transaction(async (tx) => {
        // Reemplazar las picks de bracket de este usuario en la liga activa.
        await tx
          .delete(predBracketSlot)
          .where(
            and(
              eq(predBracketSlot.userId, me.id),
              eq(predBracketSlot.leagueId, leagueId),
            ),
          );

        const rows: (typeof predBracketSlot.$inferInsert)[] = [];
        r16.forEach((teamId, i) =>
          rows.push({ userId: me.id, leagueId, stage: "r16", slotPosition: i + 1, predictedTeamId: teamId }),
        );
        qf.forEach((teamId, i) =>
          rows.push({ userId: me.id, leagueId, stage: "qf", slotPosition: i + 1, predictedTeamId: teamId }),
        );
        sf.forEach((teamId, i) =>
          rows.push({ userId: me.id, leagueId, stage: "sf", slotPosition: i + 1, predictedTeamId: teamId }),
        );
        finalists.forEach((teamId, i) =>
          rows.push({
            userId: me.id,
            leagueId,
            stage: "final",
            slotPosition: i + 1,
            predictedTeamId: teamId,
          }),
        );
        if (championTeamId) {
          rows.push({
            userId: me.id,
            leagueId,
            stage: "final",
            slotPosition: 0,
            predictedTeamId: championTeamId,
          });
        }
        if (thirdTeamId) {
          // El 3.º puesto se persiste para que el bracket visual lo refleje, pero
          // el motor de scoring NO le da puntos (decisión del producto).
          rows.push({
            userId: me.id,
            leagueId,
            stage: "third",
            slotPosition: 0,
            predictedTeamId: thirdTeamId,
          });
        }
        if (rows.length > 0) await tx.insert(predBracketSlot).values(rows);
      });

      revalidatePath("/predicciones/bracket");
      revalidatePath("/predicciones");
      return { ok: true };
    },
    (error) => ({ ok: false, error }),
  );
}
