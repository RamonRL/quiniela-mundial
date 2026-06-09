import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings, groups, groupStandings, matches, teams } from "@/lib/db/schema";
import {
  resolveThirdPlaces,
  WINNER_TO_R32_MATCH,
  type ThirdPlaceTeam,
  type ThirdPlaceResult,
} from "@/lib/bracket/third-place";
import { recomputeMatchdayDeadlines } from "@/lib/matchday-deadlines";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { isGroupStageComplete } from "./bracket-population";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quinielamundial.es";

/** Las 8 casillas de tercero del R32 (lado away en R32_SLOTS). */
export const THIRD_PLACE_R32_CODES = Object.values(WINNER_TO_R32_MATCH);

export type ThirdRow = ThirdPlaceTeam & {
  teamId: number;
  teamCode: string;
  teamName: string;
};

/** Carga los terceros (posición 3) de cada grupo cerrado, con datos de equipo. */
export async function loadThirds(): Promise<ThirdRow[]> {
  const rows = await db
    .select({
      groupCode: groups.code,
      teamId: groupStandings.teamId,
      teamCode: teams.code,
      teamName: teams.name,
      points: groupStandings.points,
      goalsFor: groupStandings.goalsFor,
      goalsAgainst: groupStandings.goalsAgainst,
    })
    .from(groupStandings)
    .innerJoin(groups, eq(groups.id, groupStandings.groupId))
    .innerJoin(teams, eq(teams.id, groupStandings.teamId))
    .where(eq(groupStandings.position, 3));

  return rows.map((r) => ({
    group: r.groupCode,
    teamId: r.teamId,
    teamCode: r.teamCode,
    teamName: r.teamName,
    points: r.points,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
  }));
}

export type ThirdsComputation = {
  thirds: ThirdRow[];
  result: ThirdPlaceResult;
  /** group letter → teamId (para poblar el bracket). */
  teamIdByGroup: Map<string, number>;
};

/** Calcula el ranking + asignación de terceros desde el estado actual. */
export async function computeThirds(): Promise<ThirdsComputation> {
  const thirds = await loadThirds();
  const result = resolveThirdPlaces(thirds);
  const teamIdByGroup = new Map(thirds.map((t) => [t.group, t.teamId]));
  return { thirds, result, teamIdByGroup };
}

export type PopulateResult =
  | { status: "ok"; changed: string[]; allocation: Record<string, string> }
  | { status: "incomplete" }
  | { status: "ambiguous" }
  | { status: "nocombo" };

/**
 * Escribe los 8 terceros en sus casillas del R32 según el Anexo C. Solo si
 * están los 12 terceros y el corte 8.º/9.º NO es ambiguo. Idempotente.
 */
export async function populateR32ThirdPlaces(): Promise<PopulateResult> {
  const { result, teamIdByGroup } = await computeThirds();
  if (!result.complete) return { status: "incomplete" };
  if (result.ambiguousCut) return { status: "ambiguous" };
  if (!result.allocation) return { status: "nocombo" };

  const allocation = result.allocation;
  const r32MatchdayIds = new Set<number>();
  const changed: string[] = [];

  await db.transaction(async (tx) => {
    for (const [matchCode, groupLetter] of Object.entries(allocation)) {
      const teamId = teamIdByGroup.get(groupLetter);
      if (teamId == null) continue;
      const [updated] = await tx
        .update(matches)
        .set({ awayTeamId: teamId })
        .where(eq(matches.code, matchCode))
        .returning({ matchdayId: matches.matchdayId });
      changed.push(matchCode);
      if (updated?.matchdayId != null) r32MatchdayIds.add(updated.matchdayId);
    }
  });

  if (r32MatchdayIds.size > 0) {
    await recomputeMatchdayDeadlines([...r32MatchdayIds]);
  }

  return { status: "ok", changed, allocation };
}

/**
 * ¿Coincide lo poblado en el bracket con la asignación que toca AHORA? Sirve
 * para detectar que una corrección de resultado cambió los terceros DESPUÉS de
 * haber abierto el R32 (situación que exige aviso urgente al admin).
 */
export async function populatedMatchesAllocation(
  allocation: Record<string, string>,
  teamIdByGroup: Map<string, number>,
): Promise<boolean> {
  const rows = await db
    .select({ code: matches.code, awayTeamId: matches.awayTeamId })
    .from(matches)
    .where(inArray(matches.code, Object.keys(allocation)));
  const byCode = new Map(rows.map((r) => [r.code, r.awayTeamId]));
  return Object.entries(allocation).every(([code, group]) => {
    const expected = teamIdByGroup.get(group);
    return byCode.get(code) === expected;
  });
}

// ─────────────────────────── Estado del gate (appSettings) ───────────────────────────

const TRANSITION_KEY = "r32_transition";

export type R32TransitionState = {
  /** ISO — cuándo se avisó por Telegram de que el cuadro está listo. */
  notifiedAt?: string;
  /** ISO — cuándo se avisó de un empate irresoluble en el corte. */
  ambiguousNotifiedAt?: string;
  /** ISO — cuándo el admin confirmó la apertura del R32. */
  openedAt?: string;
  openedBy?: string;
};

export async function getR32TransitionState(): Promise<R32TransitionState> {
  const [row] = await db
    .select({ v: appSettings.valueJson })
    .from(appSettings)
    .where(eq(appSettings.key, TRANSITION_KEY))
    .limit(1);
  return (row?.v as R32TransitionState | undefined) ?? {};
}

export async function setR32TransitionState(patch: Partial<R32TransitionState>): Promise<void> {
  const current = await getR32TransitionState();
  const next = { ...current, ...patch };
  await db
    .insert(appSettings)
    .values({ key: TRANSITION_KEY, valueJson: next })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { valueJson: next, updatedAt: new Date() },
    });
}

export async function isR32Open(): Promise<boolean> {
  const st = await getR32TransitionState();
  return Boolean(st.openedAt);
}

// ─────────────────────────── Notificación de transición ───────────────────────────

/**
 * Se llama desde el orquestador cuando finaliza un partido de grupo. Si la
 * fase de grupos ya cerró del todo, decide qué avisar por Telegram (una sola
 * vez por situación). NO abre nada por sí solo: la apertura del R32 es un clic
 * del admin (gate de seguridad). Casos:
 *  - Empate irresoluble en el corte 8.º/9.º → alerta para desempate manual.
 *  - Cuadro listo y sin abrir → aviso "revísalo y ábrelo con 1 clic".
 *  - Ya abierto y una corrección cambió los terceros → alerta urgente.
 */
export async function handleGroupStageTransition(): Promise<void> {
  if (!(await isGroupStageComplete())) return;
  const { thirds, result, teamIdByGroup } = await computeThirds();
  const st = await getR32TransitionState();

  if (result.ambiguousCut) {
    if (!st.ambiguousNotifiedAt) {
      const nameByGroup = new Map(thirds.map((t) => [t.group, t.teamName]));
      const boundary = result.ranked
        .filter((r) => r.rank === 8 || r.rank === 9)
        .map((r) => `${nameByGroup.get(r.group) ?? r.group} (gr. ${r.group})`)
        .join(" y ");
      await sendTelegramMessage(
        `⚠️ <b>Transición a R32 — empate en el corte</b>\n` +
          `Los terceros ${boundary} empatan a puntos, diferencia de goles y goles a favor justo en el 8.º/9.º puesto. ` +
          `Hay que desempatar con los criterios FIFA que no calculamos (fair-play / ranking FIFA).\n` +
          `Resuélvelo a mano en ${SITE_URL}/admin/operaciones/mejores-terceros`,
      ).catch(() => {});
      await setR32TransitionState({ ambiguousNotifiedAt: new Date().toISOString() });
    }
    return;
  }

  if (!result.allocation) return;

  if (st.openedAt) {
    const stillMatches = await populatedMatchesAllocation(result.allocation, teamIdByGroup);
    if (!stillMatches) {
      await sendTelegramMessage(
        `🚨 <b>R32 ya abierto, pero los terceros CAMBIARON</b>\n` +
          `Una corrección de resultado alteró qué terceros clasifican o en qué casilla caen. ` +
          `Revisa y vuelve a aplicar en ${SITE_URL}/admin/sync`,
      ).catch(() => {});
    }
    return;
  }

  if (!st.notifiedAt) {
    await sendTelegramMessage(
      `✅ <b>Fase de grupos cerrada</b>\n` +
        `Cuadro de R32 calculado, incluidos los 8 mejores terceros (Anexo C FIFA). ` +
        `Revísalo y ábrelo a los jugadores con 1 clic en ${SITE_URL}/admin/sync`,
    ).catch(() => {});
    await setR32TransitionState({ notifiedAt: new Date().toISOString() });
  }
}
