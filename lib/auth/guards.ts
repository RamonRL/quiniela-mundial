import { cache } from "react";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueMemberships, leagues, profiles } from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PENDING_INVITE_COOKIE, getPublicLeague } from "@/lib/leagues";
import { notifyNewUser } from "@/lib/telegram/events";
import { isAdminEmail } from "./admins";

export type CurrentUser = {
  id: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  role: "user" | "admin";
  /** Liga a la que pertenece el participante. `null` para admins. */
  leagueId: number | null;
  bannedAt: Date | null;
  countryCode: string | null;
  lastSeenAt: Date | null;
  /** Timestamp del cierre del tutorial. `null` = aún no lo ha completado. */
  tutorialCompletedAt: Date | null;
  /**
   * Zona horaria preferida del usuario (IANA, p. ej. "Europe/Madrid"). `null`
   * = "auto/default": las páginas de partidos caen a Europe/Madrid en SSR.
   * Configurable desde /ajustes.
   */
  timezone: string | null;
};

// Throttle de actualización de last_seen_at: solo escribimos cada N min
// para no doblar las queries de cada navegación. La precisión al minuto no
// importa para el caso admin.
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

/**
 * Lee la cabecera `x-vercel-ip-country` que Vercel inyecta en cada request
 * (ISO-3166-1 alpha-2 mayúsculas, e.g. "ES", "MX"). En local o en hosts no
 * Vercel devuelve null — el caller decide qué hacer.
 */
async function detectCountryCode(): Promise<string | null> {
  try {
    const h = await headers();
    const c = h.get("x-vercel-ip-country");
    if (!c) return null;
    const normalized = c.trim().toUpperCase();
    return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the currently logged-in user (auth + profile). Side-effect free
 * other than auto-creating the profile row on first sight, flipping role
 * from `user` → `admin` when the email matches `ADMIN_EMAILS`, y
 * consumiendo la cookie `pending_league_token` si el usuario llegó por un
 * invite link y aún no tiene liga asignada.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  const expectedRole: "user" | "admin" = isAdminEmail(user.email) ? "admin" : "user";

  const [existing] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);

  if (!existing) {
    // Primer login. Liga activa:
    //   - Si hay invite cookie válida → liga del invite (skipea onboarding).
    //   - Si no → NULL → el guard del layout redirige a /onboarding para
    //     que el usuario elija pública o privada.
    // Memberships: la pública es IMPLÍCITA y PERMANENTE — la insertamos
    // siempre. Si llega por invite, también la privada del invite.
    const inviteLeagueId = await resolveInviteLeague();
    const pub = await getPublicLeague();
    const activeLeagueId = inviteLeagueId ?? null;
    const countryCode = await detectCountryCode();

    const [inserted] = await db
      .insert(profiles)
      .values({
        id: user.id,
        email: user.email,
        role: expectedRole,
        leagueId: activeLeagueId,
        countryCode,
        lastSeenAt: new Date(),
      })
      .onConflictDoNothing({ target: profiles.id })
      .returning();

    // Carrera del primer login: el layout y la page se renderizan en
    // paralelo y ambos pueden ver `!existing`. Con onConflictDoNothing, la
    // request que pierde recibe `inserted === undefined`; recuperamos el
    // perfil ya creado por la ganadora en vez de reventar con una violación
    // de PK (que antes provocaba un 500 intermitente en el primer login).
    const created =
      inserted ??
      (await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1))[0];
    if (!created) return null;

    // Las membresías son idempotentes (onConflictDoNothing), así que es
    // seguro intentarlas incluso si perdimos la carrera.
    const memberships: { userId: string; leagueId: number }[] = [];
    if (pub) memberships.push({ userId: user.id, leagueId: pub.id });
    if (inviteLeagueId && inviteLeagueId !== pub?.id) {
      memberships.push({ userId: user.id, leagueId: inviteLeagueId });
    }
    if (memberships.length > 0) {
      await db.insert(leagueMemberships).values(memberships).onConflictDoNothing();
    }

    await consumeInviteCookie();

    // Alerta Telegram diferida con `after()` — se ejecuta DESPUÉS de
    // enviar la respuesta al cliente pero antes de que la función
    // serverless termine, así sobrevive al teardown de Vercel que
    // mataba el `void` fire-and-forget en producción. Solo notificamos si
    // ESTA request creó el perfil (`inserted`), no si solo lo recuperó tras
    // perder la carrera — así no se duplican alertas de "nuevo usuario". Si
    // TELEGRAM_BOT_TOKEN no está configurado, no-op silencioso
    // (ver lib/telegram/notify.ts).
    if (inserted) {
      console.log(`[telegram] new user created → notifying for ${inserted.email}`);
      after(() =>
        notifyNewUser({
          email: inserted.email,
          countryCode: inserted.countryCode,
          role: inserted.role,
        }),
      );
    }

    return mapProfile(created);
  }

  // Throttled bump de last_seen_at: solo si está vacío o más viejo que el
  // umbral, así evitamos un UPDATE por request.
  const now = Date.now();
  const lastSeenStale =
    !existing.lastSeenAt || now - existing.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS;

  // País nunca se sobreescribe (es estático), pero si la fila aún no lo
  // tiene — perfiles creados antes de la migración 0007 o detectCountryCode
  // devolvió null en su día — hacemos un backfill defensivo cuando ahora sí
  // tenemos cabecera disponible.
  const detectedCountry = !existing.countryCode ? await detectCountryCode() : null;
  const needsCountryBackfill = detectedCountry != null;

  // Combinamos los tres updates (rol + bump + backfill país) en un solo
  // UPDATE para no hacer queries back-to-back.
  const needsRoleSync = existing.role !== expectedRole;
  if (needsRoleSync || lastSeenStale || needsCountryBackfill) {
    const patch: Partial<typeof profiles.$inferInsert> = {};
    if (needsRoleSync) patch.role = expectedRole;
    if (lastSeenStale) patch.lastSeenAt = new Date(now);
    if (needsCountryBackfill) patch.countryCode = detectedCountry;
    const [updated] = await db
      .update(profiles)
      .set(patch)
      .where(eq(profiles.id, user.id))
      .returning();
    return mapProfile(updated);
  }

  return mapProfile(existing);
});

/**
 * Lee la cookie `pending_league_token` y devuelve el id de la liga privada
 * correspondiente, o null si no hay cookie o el token no resuelve. NO borra
 * la cookie — eso lo hace `consumeInviteCookie` tras insertar el perfil
 * con éxito.
 */
async function resolveInviteLeague(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_INVITE_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(and(eq(leagues.inviteToken, token), ne(leagues.isPublic, true)))
    .limit(1);
  return row?.id ?? null;
}

async function consumeInviteCookie() {
  const cookieStore = await cookies();
  if (cookieStore.get(PENDING_INVITE_COOKIE)) {
    cookieStore.delete(PENDING_INVITE_COOKIE);
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.bannedAt) redirect("/login?reason=banned");
  return me;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const me = await requireUser();
  if (me.role !== "admin") redirect("/dashboard?error=forbidden");
  return me;
}

function mapProfile(row: typeof profiles.$inferSelect): CurrentUser {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
    role: row.role,
    leagueId: row.leagueId,
    bannedAt: row.bannedAt,
    countryCode: row.countryCode,
    lastSeenAt: row.lastSeenAt,
    tutorialCompletedAt: row.tutorialCompletedAt,
    timezone: row.timezone,
  };
}
