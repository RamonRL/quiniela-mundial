"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { predBracketSlot } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { runAction } from "@/lib/actions/guard";
import { getBracketStatus } from "@/lib/bracket-state";
import {
  getBracketRepescaUntil,
  getRepescaLockedR32,
  computeLockedWinners,
} from "@/lib/bracket-repesca";
import { recomputeLeagueBracket } from "@/lib/scoring/persistence";

export type FormState = { ok: boolean; error?: string };

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
  // Editable mientras el bracket está `open` (R32 poblado, antes del 1.er R32) o
  // durante la REPESCA (reapertura corta con los R32 ya jugados bloqueados).
  const bracketStatus = await getBracketStatus();
  const repescaUntil = await getBracketRepescaUntil();
  const repescaActive = repescaUntil != null && Date.now() < repescaUntil.getTime();
  if (bracketStatus.state !== "open" && !repescaActive) {
    return {
      ok: false,
      error:
        bracketStatus.state === "waiting"
          ? "El bracket aún no está abierto."
          : "El bracket está cerrado: ya empezaron los dieciseisavos.",
    };
  }

  const { r16, qf, sf, finalists, championTeamId, thirdTeamId } = parsed.data.picks;

  const leagueId = await currentLeagueId(me);
  if (leagueId == null) {
    return { ok: false, error: "Sin liga activa." };
  }
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  if (mode !== "completo") {
    return { ok: false, error: "Esta quiniela no predice el bracket." };
  }

  // Refuerzo de servidor de la repesca: fija el ganador de los R32 ya jugados
  // según lo que el usuario tenía ANTES (no lo que mande el cliente). Si tenía
  // al ganador → se lo dejamos; si no (falló o no rellenó) → el perdedor, y
  // borramos al ganador de TODAS las rondas (no puede puntuarlo).
  let fr16 = [...r16];
  let fqf = [...qf];
  let fsf = [...sf];
  let ffinalists = [...finalists];
  let fchampion = championTeamId;
  if (repescaActive && repescaUntil) {
    const lockedR32 = await getRepescaLockedR32(repescaUntil);
    const prior = await db
      .select({ t: predBracketSlot.predictedTeamId })
      .from(predBracketSlot)
      .where(
        and(
          eq(predBracketSlot.userId, me.id),
          eq(predBracketSlot.leagueId, leagueId),
          eq(predBracketSlot.stage, "r16"),
        ),
      );
    const priorR16 = new Set(prior.map((p) => p.t).filter((x): x is number => x != null));
    const lockedWinners = computeLockedWinners(lockedR32, priorR16);
    for (const l of lockedR32) {
      const lockTeam = lockedWinners[l.code];
      const mate = lockTeam === l.advancerTeamId ? l.loserTeamId : l.advancerTeamId;
      fr16 = fr16.filter((id) => id !== mate && id !== lockTeam);
      fr16.push(lockTeam);
      if (lockTeam === l.loserTeamId) {
        const adv = l.advancerTeamId;
        fr16 = fr16.filter((id) => id !== adv);
        fqf = fqf.filter((id) => id !== adv);
        fsf = fsf.filter((id) => id !== adv);
        ffinalists = ffinalists.filter((id) => id !== adv);
        if (fchampion === adv) fchampion = null;
      }
    }
  }

  for (const [name, len, max] of [
    ["r16", fr16.length, STAGE_LIMIT.r16],
    ["qf", fqf.length, STAGE_LIMIT.qf],
    ["sf", fsf.length, STAGE_LIMIT.sf],
    ["final", ffinalists.length, STAGE_LIMIT.final],
  ] as const) {
    if (len > max) {
      return { ok: false, error: `Máximo ${max} picks en ${name}.` };
    }
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
        fr16.forEach((teamId, i) =>
          rows.push({ userId: me.id, leagueId, stage: "r16", slotPosition: i + 1, predictedTeamId: teamId }),
        );
        fqf.forEach((teamId, i) =>
          rows.push({ userId: me.id, leagueId, stage: "qf", slotPosition: i + 1, predictedTeamId: teamId }),
        );
        fsf.forEach((teamId, i) =>
          rows.push({ userId: me.id, leagueId, stage: "sf", slotPosition: i + 1, predictedTeamId: teamId }),
        );
        ffinalists.forEach((teamId, i) =>
          rows.push({
            userId: me.id,
            leagueId,
            stage: "final",
            slotPosition: i + 1,
            predictedTeamId: teamId,
          }),
        );
        if (fchampion) {
          rows.push({
            userId: me.id,
            leagueId,
            stage: "final",
            slotPosition: 0,
            predictedTeamId: fchampion,
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

      // En repesca, M73 ya está jugado → recomputamos el bracket de la liga para
      // que la edición puntúe (octavos ya tiene ganadores conocidos).
      if (repescaActive) await recomputeLeagueBracket(leagueId);

      revalidatePath("/predicciones/bracket");
      revalidatePath("/predicciones");
      revalidatePath("/ranking");
      revalidatePath("/dashboard");
      return { ok: true };
    },
    (error) => ({ ok: false, error }),
  );
}
