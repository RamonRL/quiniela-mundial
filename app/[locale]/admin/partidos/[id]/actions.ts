"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { applyMatchUpdate } from "@/lib/automation/apply-match-update";
import { runAction } from "@/lib/actions/guard";

export type FormState = { ok: boolean; error?: string };

const scorerSchema = z.object({
  playerId: z.coerce.number().int(),
  teamId: z.coerce.number().int(),
  minute: z.coerce.number().int().min(1).max(130).optional().nullable(),
  isFirstGoal: z.coerce.boolean().default(false),
  isOwnGoal: z.coerce.boolean().default(false),
  isPenalty: z.coerce.boolean().default(false),
});

const resultSchema = z.object({
  matchId: z.coerce.number().int(),
  homeScore: z.coerce.number().int().min(0).max(40),
  awayScore: z.coerce.number().int().min(0).max(40),
  status: z.enum(["scheduled", "live", "finished"]),
  wentToPens: z.coerce.boolean().default(false),
  homeScorePen: z.coerce.number().int().min(0).max(40).optional().nullable(),
  awayScorePen: z.coerce.number().int().min(0).max(40).optional().nullable(),
  winnerTeamId: z.coerce.number().int().optional().nullable(),
  scorers: z.array(scorerSchema).default([]),
});

export async function saveMatchResult(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireAdmin();
  // FormData carries scorers as repeated fields scorer[i].playerId etc. Keep it
  // simple: read a JSON string from a hidden input.
  const scorersRaw = formData.get("scorersJson");
  let scorers: unknown = [];
  try {
    scorers = scorersRaw ? JSON.parse(String(scorersRaw)) : [];
  } catch {
    scorers = [];
  }

  const parsed = resultSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    status: formData.get("status") ?? "finished",
    wentToPens: formData.get("wentToPens") === "on" || formData.get("wentToPens") === "true",
    homeScorePen: formData.get("homeScorePen") || null,
    awayScorePen: formData.get("awayScorePen") || null,
    winnerTeamId: formData.get("winnerTeamId") || null,
    scorers,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // Núcleo compartido con el sync automático. La entrada manual marca el
  // partido como `manual` para que el sync no la sobrescriba.
  return runAction(
    { action: "saveMatchResult", userId: me.id },
    async () => {
      await applyMatchUpdate(
        {
          matchId: parsed.data.matchId,
          homeScore: parsed.data.homeScore,
          awayScore: parsed.data.awayScore,
          status: parsed.data.status,
          wentToPens: parsed.data.wentToPens,
          homeScorePen: parsed.data.homeScorePen ?? null,
          awayScorePen: parsed.data.awayScorePen ?? null,
          winnerTeamId: parsed.data.winnerTeamId ?? null,
          scorers: parsed.data.scorers.map((s) => ({
            playerId: s.playerId,
            teamId: s.teamId,
            minute: s.minute ?? null,
            isOwnGoal: s.isOwnGoal,
            isPenalty: s.isPenalty,
          })),
        },
        { actor: "admin", adminId: me.id },
      );
      return { ok: true };
    },
    (error) => ({ ok: false, error }),
  );
}
