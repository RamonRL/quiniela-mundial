"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { matchScorers, matches, teams } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { recomputeMatchScoringForAllUsers } from "@/lib/scoring/persistence";
import { recomputeAllGroupStandings } from "@/lib/scoring/group-standings";
import { onMatchFinalized, onMatchReverted } from "@/lib/automation/orchestrator";
import { notifyMatchResult } from "@/lib/telegram/events";
import { alias } from "drizzle-orm/pg-core";

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

  // Compute first-goal flag from the lowest minute among non-own-goals.
  const validScorers = parsed.data.scorers.filter((s) => !s.isOwnGoal);
  if (validScorers.length > 0) {
    const minMinute = Math.min(
      ...validScorers.map((s) => (s.minute == null ? Number.POSITIVE_INFINITY : s.minute)),
    );
    parsed.data.scorers = parsed.data.scorers.map((s) => ({
      ...s,
      isFirstGoal: !s.isOwnGoal && s.minute === minMinute,
    }));
  }

  // When the match goes back to "programado", strip every result-related
  // field so the public views show dashes again instead of a stale 0-0.
  const reverting = parsed.data.status === "scheduled";

  // Capturamos el estado previo para saber si esta save pasa el partido a
  // `finished` por primera vez (→ orquestador) o lo revierte (→ undo).
  const [previousMatch] = await db
    .select({ status: matches.status })
    .from(matches)
    .where(eq(matches.id, parsed.data.matchId))
    .limit(1);
  const wasFinished = previousMatch?.status === "finished";
  const willBeFinished = parsed.data.status === "finished";

  await db.transaction(async (tx) => {
    await tx
      .update(matches)
      .set({
        homeScore: reverting ? null : parsed.data.homeScore,
        awayScore: reverting ? null : parsed.data.awayScore,
        status: parsed.data.status,
        wentToPens: reverting ? false : parsed.data.wentToPens,
        homeScorePen: reverting ? null : parsed.data.homeScorePen ?? null,
        awayScorePen: reverting ? null : parsed.data.awayScorePen ?? null,
        winnerTeamId: reverting ? null : parsed.data.winnerTeamId ?? null,
      })
      .where(eq(matches.id, parsed.data.matchId));

    await tx.delete(matchScorers).where(eq(matchScorers.matchId, parsed.data.matchId));
    if (!reverting && parsed.data.scorers.length > 0) {
      await tx.insert(matchScorers).values(
        parsed.data.scorers.map((s) => ({
          matchId: parsed.data.matchId,
          playerId: s.playerId,
          teamId: s.teamId,
          minute: s.minute ?? null,
          isFirstGoal: s.isFirstGoal,
          isOwnGoal: s.isOwnGoal,
          isPenalty: s.isPenalty,
        })),
      );
    }
  });

  await logAdminAction({
    adminId: me.id,
    action: "match.result.save",
    payload: { matchId: parsed.data.matchId, status: parsed.data.status },
  });

  // Always reconcile points so reverting wipes any stale ledger entries.
  await recomputeMatchScoringForAllUsers(parsed.data.matchId);

  // Si el partido es de fase de grupos, refresca las clasificaciones live
  // (idempotente: lee todos los group matches finished y reescribe). Así
  // /grupos y /grupos/[code] se actualizan en cuanto se guarda el resultado,
  // sin esperar al "Cerrar fase de grupos" del admin.
  const [touched] = await db
    .select({ stage: matches.stage })
    .from(matches)
    .where(eq(matches.id, parsed.data.matchId))
    .limit(1);
  if (touched?.stage === "group") {
    await recomputeAllGroupStandings();
    revalidatePath("/grupos");
    revalidatePath("/grupos/[code]", "page");
    revalidatePath("/bracket");
  }

  // Orquestador: dispara cascade del bracket, scoring incremental, bota de
  // oro al cerrar la final, y auto-resolución de specials. Llamamos a
  // onMatchFinalized también cuando re-guardamos un partido ya finalizado
  // (típicamente tras editar un winnerTeamId), porque el cascade puede haber
  // cambiado.
  if (willBeFinished) {
    await onMatchFinalized(parsed.data.matchId);
  } else if (wasFinished && !willBeFinished) {
    await onMatchReverted(parsed.data.matchId);
  }

  // Alerta Telegram fire-and-forget — solo cuando el partido se cierra
  // por primera vez (evita ruido al re-editar marcadores ya finalizados).
  if (willBeFinished && !wasFinished) {
    const homeTeams = alias(teams, "home_teams");
    const awayTeams = alias(teams, "away_teams");
    const [matchInfo] = await db
      .select({
        code: matches.code,
        stage: matches.stage,
        home: homeTeams.name,
        away: awayTeams.name,
      })
      .from(matches)
      .leftJoin(homeTeams, eq(homeTeams.id, matches.homeTeamId))
      .leftJoin(awayTeams, eq(awayTeams.id, matches.awayTeamId))
      .where(eq(matches.id, parsed.data.matchId))
      .limit(1);
    if (matchInfo) {
      void notifyMatchResult({
        matchId: parsed.data.matchId,
        code: matchInfo.code,
        stage: matchInfo.stage,
        home: matchInfo.home ?? "TBD",
        away: matchInfo.away ?? "TBD",
        homeScore: parsed.data.homeScore,
        awayScore: parsed.data.awayScore,
        wentToPens: parsed.data.wentToPens ?? false,
        homeScorePen: parsed.data.homeScorePen ?? null,
        awayScorePen: parsed.data.awayScorePen ?? null,
      });
    }
  }

  revalidatePath(`/admin/partidos/${parsed.data.matchId}`);
  revalidatePath(`/partido/${parsed.data.matchId}`);
  revalidatePath("/admin/partidos");
  revalidatePath("/calendario");
  revalidatePath("/predicciones/bracket");
  revalidatePath("/predicciones");
  revalidatePath("/bracket");
  revalidatePath("/ranking");
  return { ok: true };
}
