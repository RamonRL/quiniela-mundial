import { and, asc, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueMemberships, leagues, profiles } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/auth/guards";

export const PENDING_INVITE_COOKIE = "pending_league_token";
export const PUBLIC_LEAGUE_SLUG = "liga-principal";
export const PRIVATE_LEAGUES_PER_USER_LIMIT = 5;

/** Cached lookup of the public main league (Liga principal). */
let publicLeagueCache: { id: number; slug: string } | null = null;
export async function getPublicLeague(): Promise<{ id: number; slug: string } | null> {
  if (publicLeagueCache) return publicLeagueCache;
  const [row] = await db
    .select({ id: leagues.id, slug: leagues.slug })
    .from(leagues)
    .where(eq(leagues.slug, PUBLIC_LEAGUE_SLUG))
    .limit(1);
  if (!row) return null;
  publicLeagueCache = row;
  return row;
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
    })
    .from(leagueMemberships)
    .innerJoin(leagues, eq(leagueMemberships.leagueId, leagues.id))
    .where(eq(leagueMemberships.userId, userId))
    .orderBy(asc(leagueMemberships.joinedAt));
  // Pública primero, luego por antigüedad de la membresía.
  return rows.sort((a, b) => {
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
  | { ok: false; reason: "not_found" | "private_limit_reached"; leagueName?: string }
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

  const privateCount = await countPrivateMemberships(userId);
  if (privateCount >= PRIVATE_LEAGUES_PER_USER_LIMIT) {
    return {
      ok: false,
      reason: "private_limit_reached",
      leagueName: league.name,
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
