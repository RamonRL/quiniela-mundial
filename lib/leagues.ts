import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db/retry";
import { leagueMemberships, leagues, profiles } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/auth/guards";
import type { PredictionMode } from "@/lib/prediction-modes";
import type { LeagueTier } from "@/lib/league-tiers";

export const PENDING_INVITE_COOKIE = "pending_league_token";
export const PUBLIC_LEAGUE_SLUG = "liga-principal";
export const PRIVATE_LEAGUES_PER_USER_LIMIT = 5;

// Helpers puros sobre tiers viven en su propio módulo para que los tests
// no tiren de la conexión DB al importarlos. Re-export aquí para que los
// consumidores existentes sigan haciendo `from "@/lib/leagues"`.
export {
  MEMBER_LIMIT_FREE,
  TIER_MEMBER_LIMIT,
  isPremiumTier,
  type LeagueTier,
} from "@/lib/league-tiers";

export {
  PREDICTION_MODES,
  PREDICTION_MODE_META,
  PUBLIC_SLUG_BY_MODE,
  isPredictionMode,
  type PredictionMode,
} from "@/lib/prediction-modes";

/** Cached lookup of the public main league (modo completo). */
let publicLeagueCache: { id: number; slug: string } | null = null;
export async function getPublicLeague(): Promise<{ id: number; slug: string } | null> {
  if (publicLeagueCache) return publicLeagueCache;
  const [row] = await withDbRetry(
    () =>
      db
        .select({ id: leagues.id, slug: leagues.slug })
        .from(leagues)
        .where(eq(leagues.slug, PUBLIC_LEAGUE_SLUG))
        .limit(1),
    { label: "getPublicLeague" },
  );
  if (!row) return null;
  publicLeagueCache = row;
  return row;
}

export type PublicLeague = {
  id: number;
  slug: string;
  name: string;
  predictionMode: PredictionMode;
};

/** Las 3 quinielas públicas (una por modo), ordenadas Completo → Marcador → Ganador. */
let publicLeaguesCache: PublicLeague[] | null = null;
export async function getPublicLeagues(): Promise<PublicLeague[]> {
  if (publicLeaguesCache) return publicLeaguesCache;
  const rows = await db
    .select({
      id: leagues.id,
      slug: leagues.slug,
      name: leagues.name,
      predictionMode: leagues.predictionMode,
    })
    .from(leagues)
    .where(eq(leagues.isPublic, true));
  const order: Record<PredictionMode, number> = { completo: 0, marcador: 1, solo_ganador: 2 };
  const sorted = rows
    .map((r) => ({ ...r, predictionMode: r.predictionMode as PredictionMode }))
    .sort((a, b) => order[a.predictionMode] - order[b.predictionMode]);
  publicLeaguesCache = sorted;
  return sorted;
}

/** La liga pública del modo indicado, o null si aún no existe en BD. */
export async function getPublicLeagueByMode(
  mode: PredictionMode,
): Promise<PublicLeague | null> {
  const all = await getPublicLeagues();
  return all.find((l) => l.predictionMode === mode) ?? null;
}

/** Mapa leagueId → modo de predicción, para el scoring mode-aware. */
export async function getLeagueModes(
  leagueIds: number[],
): Promise<Map<number, PredictionMode>> {
  if (leagueIds.length === 0) return new Map();
  const rows = await withDbRetry(
    () =>
      db
        .select({ id: leagues.id, predictionMode: leagues.predictionMode })
        .from(leagues)
        .where(inArray(leagues.id, leagueIds)),
    { label: "getLeagueModes" },
  );
  return new Map(rows.map((r) => [r.id, r.predictionMode as PredictionMode]));
}

/**
 * Liga ACTIVA del usuario — la que está viendo ahora mismo. Lee directamente
 * `profiles.leagueId`. Si por la razón que sea el perfil no la tiene
 * asignada, fallback a la pública para no romper queries (el caller de
 * onboarding redirige antes que esto se ejecute).
 */
export async function currentLeagueId(me: CurrentUser): Promise<number | null> {
  if (me.leagueId != null) return me.leagueId;
  const pub = await getPublicLeague();
  return pub?.id ?? null;
}

/**
 * Filtro Drizzle: matchea profiles que son miembros de `leagueId`. Reemplaza
 * al antiguo OR `role='admin'` — el admin ya no se trata como "global", solo
 * aparece en las ligas en las que está realmente inscrito.
 *
 * Si `leagueId` es null devolvemos undefined (sin filtro) — defensa contra
 * estados transitorios; el caller decide qué hacer.
 */
export function inLeagueFilter(leagueId: number | null): SQL | undefined {
  if (leagueId == null) return undefined;
  return inArray(
    profiles.id,
    db
      .select({ id: leagueMemberships.userId })
      .from(leagueMemberships)
      .where(eq(leagueMemberships.leagueId, leagueId)),
  );
}

export type Membership = {
  id: number;
  name: string;
  slug: string;
  isPublic: boolean;
  joinCode: string | null;
  joinedAt: Date;
  logoUrl: string | null;
  predictionMode: PredictionMode;
};

/**
 * Devuelve todas las ligas en las que `userId` está inscrito, ordenadas con
 * la pública primero y luego por antigüedad de la membresía. Lo usa el
 * LeagueSwitcher del header y la sección "Mis quinielas" del perfil.
 */
export async function getMembershipsForUser(userId: string): Promise<Membership[]> {
  const rows = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      slug: leagues.slug,
      isPublic: leagues.isPublic,
      joinCode: leagues.joinCode,
      joinedAt: leagueMemberships.joinedAt,
      logoUrl: leagues.logoUrl,
      predictionMode: leagues.predictionMode,
    })
    .from(leagueMemberships)
    .innerJoin(leagues, eq(leagueMemberships.leagueId, leagues.id))
    .where(eq(leagueMemberships.userId, userId))
    .orderBy(asc(leagueMemberships.joinedAt));
  // Pública primero, luego por antigüedad de la membresía.
  return rows
    .map((r) => ({ ...r, predictionMode: r.predictionMode as PredictionMode }))
    .sort((a, b) => {
      if (a.isPublic !== b.isPublic) return a.isPublic ? -1 : 1;
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });
}

/**
 * Cuenta cuántas ligas privadas tiene el usuario. Para validar el límite de
 * 5 antes de un join.
 */
export async function countPrivateMemberships(userId: string): Promise<number> {
  const rows = await db
    .select({ id: leagues.id })
    .from(leagueMemberships)
    .innerJoin(leagues, eq(leagueMemberships.leagueId, leagues.id))
    .where(and(eq(leagueMemberships.userId, userId), eq(leagues.isPublic, false)));
  return rows.length;
}

/**
 * Cuenta los miembros actuales de una liga. Usado para mostrar el contador
 * "X / Y miembros" y para validar el tope antes de un join.
 */
export async function countLeagueMembers(leagueId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leagueMemberships)
    .where(eq(leagueMemberships.leagueId, leagueId));
  return row?.count ?? 0;
}

/**
 * Comprueba si una liga acepta a un miembro más. Devuelve ok=true si la
 * liga no tiene tope (`memberLimit` NULL, p.ej. la pública) o si todavía
 * hay hueco. Devuelve `full` con el contador actual y el tope cuando ya
 * no caben más — el caller traduce el mensaje al usuario.
 */
export async function canJoinLeague(leagueId: number): Promise<
  | { ok: true }
  | { ok: false; reason: "full"; current: number; limit: number }
> {
  const [league] = await db
    .select({ memberLimit: leagues.memberLimit })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) return { ok: true };
  if (league.memberLimit == null) return { ok: true };
  const current = await countLeagueMembers(leagueId);
  if (current >= league.memberLimit) {
    return { ok: false, reason: "full", current, limit: league.memberLimit };
  }
  return { ok: true };
}

export async function isMemberOf(userId: string, leagueId: number): Promise<boolean> {
  const [row] = await db
    .select({ userId: leagueMemberships.userId })
    .from(leagueMemberships)
    .where(
      and(
        eq(leagueMemberships.userId, userId),
        eq(leagueMemberships.leagueId, leagueId),
      ),
    )
    .limit(1);
  return !!row;
}

/**
 * Une al usuario `userId` a la liga identificada por `inviteToken` si todavía
 * no es miembro y no excede el límite de 5 privadas. Idempotente. No
 * redirige — devuelve un resultado para que el caller decida.
 *
 * Lo usan tanto la server action `acceptInvite` (cuando el usuario pulsa
 * "Aceptar") como el callback de OAuth (cuando un usuario existente vuelve
 * autenticado y aún tiene la cookie pending_league_token).
 */
export async function joinLeagueByInviteToken(
  userId: string,
  inviteToken: string,
): Promise<
  | { ok: true; leagueId: number; alreadyMember: boolean }
  | {
      ok: false;
      reason: "not_found" | "private_limit_reached" | "league_full";
      leagueName?: string;
      current?: number;
      limit?: number;
    }
> {
  const [league] = await db
    .select()
    .from(leagues)
    .where(and(eq(leagues.inviteToken, inviteToken), eq(leagues.isPublic, false)))
    .limit(1);
  if (!league) return { ok: false, reason: "not_found" };

  const already = await isMemberOf(userId, league.id);
  if (already) {
    await db.update(profiles).set({ leagueId: league.id }).where(eq(profiles.id, userId));
    return { ok: true, leagueId: league.id, alreadyMember: true };
  }

  // Admins exentos del tope de privadas (gestionan/demuestran muchas ligas).
  // Solo consultamos el rol cuando ya se alcanzó el límite, para no añadir
  // una query al camino feliz.
  const privateCount = await countPrivateMemberships(userId);
  if (privateCount >= PRIVATE_LEAGUES_PER_USER_LIMIT) {
    const [prof] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    if (prof?.role !== "admin") {
      return {
        ok: false,
        reason: "private_limit_reached",
        leagueName: league.name,
      };
    }
  }

  const cap = await canJoinLeague(league.id);
  if (!cap.ok) {
    return {
      ok: false,
      reason: "league_full",
      leagueName: league.name,
      current: cap.current,
      limit: cap.limit,
    };
  }

  await db
    .insert(leagueMemberships)
    .values({ userId, leagueId: league.id })
    .onConflictDoNothing();
  await db.update(profiles).set({ leagueId: league.id }).where(eq(profiles.id, userId));
  return { ok: true, leagueId: league.id, alreadyMember: false };
}

/**
 * Genera un joinCode de 4 dígitos único. Reintenta hasta 50 veces ante
 * colisión (improbable hasta varios miles de ligas). Si falla, lanza.
 */
export async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const [exists] = await db
      .select({ id: leagues.id })
      .from(leagues)
      .where(eq(leagues.joinCode, code))
      .limit(1);
    if (!exists) return code;
  }
  throw new Error("No se pudo generar un código único tras 50 intentos.");
}

function slugifyLeagueName(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "liga"
  );
}

export type CreatedLeagueRecord = {
  id: number;
  name: string;
  slug: string;
  joinCode: string | null;
  inviteToken: string;
  logoUrl: string | null;
  tier: LeagueTier;
};

/**
 * Núcleo de creación de una liga privada: slug único, invite token, joinCode,
 * inserción, auto-inscripción del creador y fijarla como liga activa. NO
 * valida límites, ni notifica, ni revalida — eso lo hace cada caller
 * (`createLeague` para Free, `createPaidLeagueFromTransaction` tras pago).
 *
 * Si `paid` viene, la liga nace ya con el tier comprado y se sella con el
 * `paidTxId` (clave de idempotencia del flujo "pagar antes de crear").
 */
export async function createLeagueRecord(opts: {
  userId: string;
  name: string;
  mode: PredictionMode;
  logoUrl: string;
  tier: LeagueTier;
  memberLimit: number | null;
  paid?: { txId: string; amountEur: number };
}): Promise<CreatedLeagueRecord> {
  const baseSlug = slugifyLeagueName(opts.name);
  let slug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const [clash] = await db
      .select({ id: leagues.id })
      .from(leagues)
      .where(eq(leagues.slug, slug))
      .limit(1);
    if (!clash) break;
    slug = `${baseSlug}-${randomUUID().slice(0, 4)}`;
  }
  const inviteToken = randomUUID().replace(/-/g, "");
  const joinCode = await generateUniqueJoinCode();

  const [created] = await db
    .insert(leagues)
    .values({
      slug,
      name: opts.name,
      inviteToken,
      joinCode,
      isPublic: false,
      createdBy: opts.userId,
      logoUrl: opts.logoUrl,
      tier: opts.tier,
      memberLimit: opts.memberLimit,
      predictionMode: opts.mode,
      ...(opts.paid
        ? {
            paidTxId: opts.paid.txId,
            paidAt: new Date(),
            paidAmountEur: opts.paid.amountEur,
            paidVia: "paddle",
          }
        : {}),
    })
    .returning();

  await db
    .insert(leagueMemberships)
    .values({ userId: opts.userId, leagueId: created.id })
    .onConflictDoNothing();
  await db
    .update(profiles)
    .set({ leagueId: created.id })
    .where(eq(profiles.id, opts.userId));

  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
    joinCode: created.joinCode,
    inviteToken: created.inviteToken,
    logoUrl: created.logoUrl,
    tier: created.tier as LeagueTier,
  };
}
