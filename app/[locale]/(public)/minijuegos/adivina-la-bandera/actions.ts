"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { minigameScores } from "@/lib/db/schema";
import { WORLD_COUNTRIES, type CountryEntry } from "@/lib/world-flags";
import { resolveIdentity } from "../_lib/identity-server";
import { signToken, verifyToken } from "../_lib/token";

const GAME_KEY = "adivina-la-bandera";
const TARGET_ROUND_COUNT = 50;
const TOKEN_TTL_MS = 10 * 60 * 1000;

export type RoundOption = {
  code: string;
  name: string;
};

export type Round = {
  roundId: number;
  flagCode: string;
  options: RoundOption[];
  correctCode: string;
};

type StartResult =
  | { ok: true; token: string; rounds: Round[]; totalRounds: number }
  | { ok: false; error: string };

/**
 * Genera ~50 rondas con un país objetivo y 3 distractores aleatorios.
 * No distinguimos por región/continente — un distractor de otro
 * continente es perfectamente válido para el juego.
 */
export async function startRound(): Promise<StartResult> {
  const pool = WORLD_COUNTRIES.slice();
  if (pool.length < 4) {
    return { ok: false, error: "Catálogo de banderas insuficiente." };
  }
  const targets = shuffle(pool).slice(0, Math.min(TARGET_ROUND_COUNT, pool.length));

  const rounds: Round[] = [];
  const answers: Record<number, string> = {};

  for (let i = 0; i < targets.length; i++) {
    const correct = targets[i]!;
    const distractors = pickDistractors(correct, pool);
    if (distractors.length < 3) continue;
    const roundId = i + 1;
    const options = shuffle([correct, ...distractors]).map((c) => ({
      code: c.code,
      name: c.name,
    }));
    rounds.push({
      roundId,
      flagCode: correct.code,
      options,
      correctCode: correct.code,
    });
    answers[roundId] = correct.code;
  }

  if (rounds.length === 0) {
    return { ok: false, error: "No fue posible preparar la partida." };
  }

  const token = signToken({
    g: GAME_KEY,
    exp: Date.now() + TOKEN_TTL_MS,
    answers,
  });

  return { ok: true, token, rounds, totalRounds: rounds.length };
}

const submitSchema = z.object({
  token: z.string().min(20).max(20000),
  answers: z
    .array(z.object({ roundId: z.number().int(), chosenCode: z.string().min(2).max(4) }))
    .max(TARGET_ROUND_COUNT + 10),
  nickname: z.string().trim().max(40).optional(),
});

type SubmitResult =
  | {
      ok: true;
      score: number;
      previousBest: number | null;
      improved: boolean;
      rank: number;
      totalParticipants: number;
      identityKey: string;
      displayName: string;
    }
  | { ok: false; error: string };

export async function submitScore(input: unknown): Promise<SubmitResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  type Payload = { g: string; exp: number; answers: Record<string, string> };
  const payload = verifyToken<Payload>(parsed.data.token);
  if (!payload) return { ok: false, error: "Token de sesión inválido." };
  if (payload.g !== GAME_KEY) return { ok: false, error: "Token de otro juego." };
  if (payload.exp < Date.now()) return { ok: false, error: "La sesión ha caducado." };

  let score = 0;
  const seen = new Set<number>();
  for (const a of parsed.data.answers) {
    if (seen.has(a.roundId)) continue;
    seen.add(a.roundId);
    const correct = payload.answers[String(a.roundId)];
    if (correct != null && correct === a.chosenCode) score++;
  }

  let identity: Awaited<ReturnType<typeof resolveIdentity>>;
  try {
    identity = await resolveIdentity(parsed.data.nickname ?? null);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No fue posible identificarte.",
    };
  }

  const [prevRow] = await db
    .select({ best: minigameScores.bestScore })
    .from(minigameScores)
    .where(
      and(
        eq(minigameScores.gameKey, GAME_KEY),
        eq(minigameScores.identityKey, identity.identityKey),
      ),
    )
    .limit(1);
  const previousBest = prevRow?.best ?? null;
  const improved = previousBest == null || score > previousBest;

  await db
    .insert(minigameScores)
    .values({
      gameKey: GAME_KEY,
      userId: identity.userId,
      guestNickname: identity.guestNickname,
      identityKey: identity.identityKey,
      displayName: identity.displayName,
      bestScore: score,
      playedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [minigameScores.gameKey, minigameScores.identityKey],
      set: {
        bestScore: sql`GREATEST(${minigameScores.bestScore}, ${score})`,
        displayName: identity.displayName,
        playedAt: new Date(),
      },
    });

  const finalScore = improved ? score : previousBest!;
  const [rankRow] = await db
    .select({ ahead: sql<number>`COUNT(*)::int` })
    .from(minigameScores)
    .where(
      and(eq(minigameScores.gameKey, GAME_KEY), gt(minigameScores.bestScore, finalScore)),
    );
  const rank = (rankRow?.ahead ?? 0) + 1;

  const [totalRow] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(minigameScores)
    .where(eq(minigameScores.gameKey, GAME_KEY));

  revalidatePath("/minijuegos");
  revalidatePath("/minijuegos/adivina-la-bandera");

  return {
    ok: true,
    score,
    previousBest,
    improved,
    rank,
    totalParticipants: totalRow?.n ?? 0,
    identityKey: identity.identityKey,
    displayName: identity.displayName,
  };
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function pickDistractors(correct: CountryEntry, pool: readonly CountryEntry[]): CountryEntry[] {
  const taken = new Set<string>([correct.code]);
  const picks: CountryEntry[] = [];
  for (const c of shuffle(pool)) {
    if (picks.length >= 3) break;
    if (taken.has(c.code)) continue;
    taken.add(c.code);
    picks.push(c);
  }
  return picks;
}
