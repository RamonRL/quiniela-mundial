"use server";

import { and, eq, gt, isNotNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { minigameScores, players, teams } from "@/lib/db/schema";
import { resolveIdentity } from "../_lib/identity-server";
import { signToken, verifyToken } from "../_lib/token";

const GAME_KEY = "quien-es-quien";
/** Suficiente cabecera para 60s incluso jugando muy rápido. */
const TARGET_ROUND_COUNT = 50;
/** Caduca el token a los 10 minutos — generoso, pero evita reusos infinitos. */
const TOKEN_TTL_MS = 10 * 60 * 1000;
/** Mínimo de jugadores con foto para que el juego sea jugable. */
const MIN_POOL_SIZE = 4;

export type RoundOption = {
  playerId: number;
  name: string;
  teamCode: string;
};

export type Round = {
  roundId: number;
  photoUrl: string;
  options: RoundOption[];
  /**
   * Respuesta correcta enviada al cliente para feedback inmediato. El
   * ranking sigue siendo seguro porque el servidor recomputa el score en
   * `submitScore` a partir del token HMAC; el campo aquí es solo UI.
   */
  correctPlayerId: number;
};

type StartResult =
  | { ok: true; token: string; rounds: Round[]; totalRounds: number }
  | { ok: false; error: string };

type EligiblePlayer = {
  id: number;
  name: string;
  photoUrl: string;
  position: string | null;
  teamId: number;
  teamCode: string;
};

/**
 * Prepara una sesión: selecciona ~50 jugadores con foto y construye rondas
 * con 3 distractores plausibles cada una (mismo equipo → misma posición →
 * cualquiera). Firma las respuestas correctas en un token HMAC que el
 * cliente devolverá en submitScore — el servidor nunca le manda al cliente
 * qué opción es la buena.
 */
export async function startRound(): Promise<StartResult> {
  const rows = await db
    .select({
      id: players.id,
      name: players.name,
      photoUrl: players.photoUrl,
      position: players.position,
      teamId: players.teamId,
      teamCode: teams.code,
    })
    .from(players)
    .innerJoin(teams, eq(players.teamId, teams.id))
    .where(isNotNull(players.photoUrl));

  const pool: EligiblePlayer[] = rows
    .filter((r): r is EligiblePlayer => Boolean(r.photoUrl))
    .map((r) => ({
      id: r.id,
      name: r.name,
      photoUrl: r.photoUrl!,
      position: r.position,
      teamId: r.teamId,
      teamCode: r.teamCode,
    }));

  if (pool.length < MIN_POOL_SIZE) {
    return {
      ok: false,
      error:
        "Aún no hay suficientes jugadores con foto para jugar. Vuelve cuando se carguen más plantillas.",
    };
  }

  const byTeam = new Map<number, EligiblePlayer[]>();
  const byPosition = new Map<string, EligiblePlayer[]>();
  for (const p of pool) {
    let bt = byTeam.get(p.teamId);
    if (!bt) byTeam.set(p.teamId, (bt = []));
    bt.push(p);
    if (p.position) {
      let bp = byPosition.get(p.position);
      if (!bp) byPosition.set(p.position, (bp = []));
      bp.push(p);
    }
  }

  const shuffled = shuffle(pool);
  const targets = shuffled.slice(0, Math.min(TARGET_ROUND_COUNT, shuffled.length));

  const rounds: Round[] = [];
  const answers: Record<number, number> = {};

  for (let i = 0; i < targets.length; i++) {
    const correct = targets[i]!;
    const distractors = pickDistractors(correct, pool, byTeam, byPosition);
    if (distractors.length < 3) continue;
    const roundId = i + 1;
    const options = shuffle([correct, ...distractors]).map((p) => ({
      playerId: p.id,
      name: p.name,
      teamCode: p.teamCode,
    }));
    rounds.push({
      roundId,
      photoUrl: correct.photoUrl,
      options,
      correctPlayerId: correct.id,
    });
    answers[roundId] = correct.id;
  }

  if (rounds.length === 0) {
    return {
      ok: false,
      error: "No fue posible preparar la partida. Inténtalo de nuevo.",
    };
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
  // Cliente solo nos pasa los aciertos/fallos resueltos; preguntas sin
  // respuesta (timer agotado) simplemente no aparecen en el array.
  answers: z
    .array(z.object({ roundId: z.number().int(), chosenPlayerId: z.number().int() }))
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

  type Payload = { g: string; exp: number; answers: Record<string, number> };
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
    if (correct != null && correct === a.chosenPlayerId) score++;
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

  // Posición: 1-based ranking del usuario por bestScore. Una sola query con
  // COUNT(*) WHERE best_score > finalScore + 1, así no traemos toda la tabla.
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
  revalidatePath("/minijuegos/quien-es-quien");

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

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Elige 3 distractores: primero del mismo equipo (más difícil — el jugador
 * que conoces puede ser cualquiera del XI); si no llega, completa con misma
 * posición; si aún falta, con cualquier otro jugador del pool. Excluye al
 * propio correcto.
 */
function pickDistractors(
  correct: EligiblePlayer,
  pool: EligiblePlayer[],
  byTeam: Map<number, EligiblePlayer[]>,
  byPosition: Map<string, EligiblePlayer[]>,
): EligiblePlayer[] {
  const taken = new Set<number>([correct.id]);
  const picks: EligiblePlayer[] = [];

  const tryAdd = (candidates: EligiblePlayer[] | undefined) => {
    if (!candidates) return;
    for (const c of shuffle(candidates)) {
      if (picks.length >= 3) return;
      if (taken.has(c.id)) continue;
      taken.add(c.id);
      picks.push(c);
    }
  };

  tryAdd(byTeam.get(correct.teamId));
  if (correct.position) tryAdd(byPosition.get(correct.position));
  tryAdd(pool);
  return picks;
}
