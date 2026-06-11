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

/**
 * ¿Puede `user` GESTIONAR esta liga (editar ajustes, logo/branding, anuncio,
 * departamentos, expulsar miembros)? Lo puede el creador y, además, cualquier
 * admin de la plataforma (ADMIN_EMAILS) actúa como CO-ADMIN de cualquier liga
 * PRIVADA — así una cuenta admin es siempre gestora de las quinielas a las que
 * pertenece. La quiniela PÚBLICA nunca se gestiona desde la UI de usuario.
 *
 * Ojo: BORRAR una liga NO pasa por aquí. Eso sigue siendo exclusivo del
 * creador real (`createdBy`), para que un co-admin no elimine por accidente la
 * quiniela de otra persona; un admin que necesite borrarla lo hace desde
 * /admin/ligas.
 */
export function canManageLeague(
  user: { id: string; role: "user" | "admin" },
  league: { createdBy: string | null; isPublic: boolean },
): boolean {
  if (league.isPublic) return false;
  return league.createdBy === user.id || user.role === "admin";
}

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
  /** Anuncio fijado del owner (premium). Null = sin anuncio. */
  announcement: string | null;
  /** Creador de la liga — para saber si el usuario actual es el owner. */
  createdBy: string | null;
  /** Logo de marca (premium): sustituye el wordmark QM en el shell. */
  brandLogoUrl: string | null;
  /** Variante de la marca para tema claro. Null = se usa brandLogoUrl. */
  brandLogoLightUrl: string | null;
  /** Tier de la liga — para gating premium en el shell. */
  tier: LeagueTier;
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
      announcement: leagues.announcement,
      createdBy: leagues.createdBy,
      brandLogoUrl: leagues.brandLogoUrl,
      brandLogoLightUrl: leagues.brandLogoLightUrl,
      tier: leagues.tier,
    })
    .from(leagueMemberships)
    .innerJoin(leagues, eq(leagueMemberships.leagueId, leagues.id))
    .where(eq(leagueMemberships.userId, userId))
    .orderBy(asc(leagueMemberships.joinedAt));
  // Pública primero, luego por antigüedad de la membresía.
  return rows
    .map((r) => ({
      ...r,
      predictionMode: r.predictionMode as PredictionMode,
      tier: r.tier as LeagueTier,
    }))
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
 * Inscribe a `userId` en `leagueId` de forma ATÓMICA respecto al cupo.
 *
 * `canJoinLeague` + insert por separado es un TOCTOU: dos personas abriendo el
 * invite link a la vez leen ambas `count < limit` antes de que ninguna
 * confirme, y las dos entran → la liga se pasa del tope (p.ej. 22/20). Aquí
 * bloqueamos la FILA de la liga (`SELECT … FOR UPDATE`): los joins concurrentes
 * a la MISMA liga se serializan, así que el segundo re-cuenta ya con el primero
 * dentro y, si toca, recibe "full". Idempotente si ya es miembro.
 */
export async function joinLeagueAtomic(
  userId: string,
  leagueId: number,
): Promise<
  | { ok: true; alreadyMember: boolean }
  | { ok: false; reason: "full"; current: number; limit: number }
> {
  return withDbRetry(
    () =>
      db.transaction(async (tx) => {
        // Lock de la fila → serializa los joins concurrentes a esta liga.
        const [lg] = await tx
          .select({ memberLimit: leagues.memberLimit })
          .from(leagues)
          .where(eq(leagues.id, leagueId))
          .limit(1)
          .for("update");
        if (!lg) return { ok: true as const, alreadyMember: false };

        const [existing] = await tx
          .select({ userId: leagueMemberships.userId })
          .from(leagueMemberships)
          .where(
            and(
              eq(leagueMemberships.userId, userId),
              eq(leagueMemberships.leagueId, leagueId),
            ),
          )
          .limit(1);
        if (existing) return { ok: true as const, alreadyMember: true };

        if (lg.memberLimit != null) {
          const [cnt] = await tx
            .select({ c: sql<number>`count(*)::int` })
            .from(leagueMemberships)
            .where(eq(leagueMemberships.leagueId, leagueId));
          const current = cnt?.c ?? 0;
          if (current >= lg.memberLimit) {
            return { ok: false as const, reason: "full" as const, current, limit: lg.memberLimit };
          }
        }

        await tx
          .insert(leagueMemberships)
          .values({ userId, leagueId })
          .onConflictDoNothing();
        return { ok: true as const, alreadyMember: false };
      }),
    { label: "joinLeagueAtomic" },
  );
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

  const joined = await joinLeagueAtomic(userId, league.id);
  if (!joined.ok) {
    return {
      ok: false,
      reason: "league_full",
      leagueName: league.name,
      current: joined.current,
      limit: joined.limit,
    };
  }

  await db.update(profiles).set({ leagueId: league.id }).where(eq(profiles.id, userId));
  return { ok: true, leagueId: league.id, alreadyMember: joined.alreadyMember };
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
