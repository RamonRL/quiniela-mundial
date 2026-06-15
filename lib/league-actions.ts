"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { commercialLeads, leagueMemberships, leagues, profiles } from "@/lib/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin/audit";
import { notifyNewPrivateLeague } from "@/lib/telegram/events";
import { uploadImage, deleteImage } from "@/lib/storage";
import { rateLimit } from "@/lib/ratelimit";
import {
  MEMBER_LIMIT_FREE,
  PENDING_INVITE_COOKIE,
  PRIVATE_LEAGUES_PER_USER_LIMIT,
  canManageLeague,
  countPrivateMemberships,
  createLeagueRecord,
  getPublicLeague,
  isMemberOf,
  isPremiumTier,
  joinLeagueAtomic,
  joinLeagueByInviteToken,
} from "@/lib/leagues";
import { TIER_LABEL, canUseBranding } from "@/lib/league-tiers";
import { PREDICTION_MODE_META, type PredictionMode } from "@/lib/prediction-modes";
import { presetUrlById, DEFAULT_PRESET_LOGO_URL } from "@/lib/league-logos";
import {
  getPaddleClient,
  isPaidTier,
  paddlePriceIdForTier,
  type PaidTierId,
} from "@/lib/paddle";
import { createPaidLeagueFromTransaction } from "@/lib/paddle-upgrade";

export type LeagueFormState = { ok: boolean; error?: string; message?: string };

const PRIVATE_LIMIT_ERROR = `Tienes ${PRIVATE_LEAGUES_PER_USER_LIMIT} quinielas privadas. Para unirte a una nueva, abandona alguna desde tu perfil.`;

function leagueFullError(leagueName: string, limit: number): string {
  return `"${leagueName}" está completa (${limit}/${limit} miembros). El creador puede ampliarla contratando un Pase Mundial 2026 — más info en /precios.`;
}

const NAME_MAX = 25;
// Tope defensivo del logo en servidor — el cliente comprime con
// compressImage(maxDim 400, q 0.85) a <100KB, esto es solo fallback.
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(NAME_MAX, `El nombre no puede pasar de ${NAME_MAX} caracteres.`),
  mode: z.enum(["completo", "marcador", "solo_ganador"]).default("completo"),
});

export type CreateLeagueResult = LeagueFormState & {
  league?: {
    id: number;
    name: string;
    slug: string;
    joinCode: string | null;
    inviteToken: string;
    logoUrl: string | null;
  };
};

/**
 * Crea una nueva liga privada. Abierto a cualquier usuario logueado (no
 * solo admin). El creador queda automáticamente inscrito y la liga pasa a
 * ser su liga activa. Se valida el límite de 5 privadas.
 */
export async function createLeague(
  _prev: CreateLeagueResult,
  formData: FormData,
): Promise<CreateLeagueResult> {
  const me = await requireUser();
  const parsed = createSchema.safeParse({
    name: formData.get("name") ?? "",
    mode: formData.get("mode") ?? "completo",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // Los admins no tienen tope de quinielas privadas (gestionan/demuestran
  // muchas ligas). El resto sigue limitado a PRIVATE_LEAGUES_PER_USER_LIMIT.
  const privateCount = await countPrivateMemberships(me.id);
  if (me.role !== "admin" && privateCount >= PRIVATE_LEAGUES_PER_USER_LIMIT) {
    return { ok: false, error: PRIVATE_LIMIT_ERROR };
  }

  // Las ligas nuevas arrancan en tier Free con límite 20. El usuario elige
  // un logo de la galería preset desde el onboarding (los Pases Mundial
  // 2026 desbloquean logo corporativo custom — se sube desde /mi-quiniela
  // después de que el admin marque el upgrade).
  const presetId = formData.get("logoPresetId");
  const presetUrl =
    typeof presetId === "string" ? presetUrlById(presetId) : null;
  const initialLogoUrl = presetUrl ?? DEFAULT_PRESET_LOGO_URL;

  const created = await createLeagueRecord({
    userId: me.id,
    name: parsed.data.name,
    mode: parsed.data.mode,
    logoUrl: initialLogoUrl,
    tier: "free",
    memberLimit: MEMBER_LIMIT_FREE,
  });

  if (me.role === "admin") {
    await logAdminAction({
      adminId: me.id,
      action: "league.create",
      payload: { id: created.id, slug: created.slug },
    });
  }

  // Alerta Telegram diferida (sobrevive al teardown serverless).
  console.log(`[telegram] new league created → notifying for ${created.name}`);
  after(() =>
    notifyNewPrivateLeague({
      id: created.id,
      name: created.name,
      joinCode: created.joinCode,
      creatorEmail: me.email,
      modeLabel: PREDICTION_MODE_META[parsed.data.mode].label,
      planLabel: TIER_LABEL[created.tier],
    }),
  );

  revalidatePath("/admin/ligas");
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: `Creada "${created.name}".`,
    league: {
      id: created.id,
      name: created.name,
      slug: created.slug,
      joinCode: created.joinCode,
      inviteToken: created.inviteToken,
      logoUrl: created.logoUrl,
    },
  };
}

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "El código debe tener exactamente 4 dígitos."),
});

/**
 * Une al usuario actual a una liga buscada por su `joinCode` de 4 dígitos.
 * Idempotente si ya es miembro. Valida el límite de 5 privadas.
 */
export async function joinLeagueByCode(
  _prev: LeagueFormState,
  formData: FormData,
): Promise<LeagueFormState> {
  const me = await requireUser();
  const parsed = codeSchema.safeParse({ code: formData.get("code") ?? "" });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Código inválido" };
  }

  const [league] = await db
    .select()
    .from(leagues)
    .where(and(eq(leagues.joinCode, parsed.data.code), eq(leagues.isPublic, false)))
    .limit(1);
  if (!league) {
    return { ok: false, error: "No existe ninguna quiniela con ese código." };
  }

  const already = await isMemberOf(me.id, league.id);
  if (already) {
    await db
      .update(profiles)
      .set({ leagueId: league.id })
      .where(eq(profiles.id, me.id));
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  // Admins exentos del tope de privadas (ver createLeague).
  const privateCount = await countPrivateMemberships(me.id);
  if (me.role !== "admin" && privateCount >= PRIVATE_LEAGUES_PER_USER_LIMIT) {
    return { ok: false, error: PRIVATE_LIMIT_ERROR };
  }

  // Inscripción atómica respecto al cupo (evita pasarse del tope por carrera).
  const joined = await joinLeagueAtomic(me.id, league.id);
  if (!joined.ok) {
    return { ok: false, error: leagueFullError(league.name, joined.limit) };
  }
  await db
    .update(profiles)
    .set({ leagueId: league.id })
    .where(eq(profiles.id, me.id));
  revalidatePath("/", "layout");
  // Join nuevo por código → popup de bienvenida en el dashboard (la
  // reactivación de un miembro existente, más arriba, va sin popup).
  redirect("/dashboard?welcome=1");
}

/**
 * Cambia la liga activa del usuario. Valida que sea miembro. Revalida el
 * layout para cachés/navegaciones futuras; el cliente además hace
 * `router.refresh()` para re-renderizar la ruta actual (p. ej. /predicciones)
 * con las predicciones de la nueva liga sin tener que navegar.
 */
export async function setActiveLeague(leagueId: number) {
  const me = await requireUser();
  if (!Number.isFinite(leagueId)) return;
  const member = await isMemberOf(me.id, leagueId);
  if (!member) return;
  await db.update(profiles).set({ leagueId }).where(eq(profiles.id, me.id));
  revalidatePath("/", "layout");
}

/**
 * Abandona una liga privada. La pública es permanente y nunca se abandona.
 * Si la liga abandonada era la activa, la activa pasa a la pública.
 */
export async function leaveLeague(formData: FormData): Promise<LeagueFormState> {
  const me = await requireUser();
  const id = Number(formData.get("leagueId"));
  if (!Number.isFinite(id)) return { ok: false, error: "Datos inválidos" };

  const [target] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, id))
    .limit(1);
  if (!target) return { ok: false, error: "Liga no encontrada." };
  if (target.isPublic) {
    return {
      ok: false,
      error: "La Quiniela Pública es permanente y no se puede abandonar.",
    };
  }

  await db
    .delete(leagueMemberships)
    .where(
      and(
        eq(leagueMemberships.userId, me.id),
        eq(leagueMemberships.leagueId, id),
      ),
    );

  // Si era la activa, mover a la pública.
  if (me.leagueId === id) {
    const pub = await getPublicLeague();
    if (pub) {
      await db
        .update(profiles)
        .set({ leagueId: pub.id })
        .where(eq(profiles.id, me.id));
    }
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `Has abandonado "${target.name}".` };
}

/**
 * Aceptar una invitación. Llamado desde /invite/[token] como server action
 * de un botón.
 *  - No logueado: setea cookie con el token y redirige a /login.
 *  - Logueado, ya miembro: idempotente, set como activa y redirige.
 *  - Logueado, no miembro: valida límite de 5 privadas, inscribe y set activa.
 */
export async function acceptInvite(token: string): Promise<{
  status:
    | "redirected_to_login"
    | "redirected_home"
    | "joined"
    | "private_limit_reached"
    | "league_full";
  leagueName?: string;
  limit?: number;
}> {
  const [league] = await db
    .select()
    .from(leagues)
    .where(and(eq(leagues.inviteToken, token), eq(leagues.isPublic, false)))
    .limit(1);
  if (!league) {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    const cookieStore = await cookies();
    cookieStore.set(PENDING_INVITE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24h
      path: "/",
    });
    redirect(`/login?next=${encodeURIComponent("/dashboard")}`);
  }

  const [me] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (!me) {
    // Profile aún no creado (callback intermedio). Cookie + redirect.
    const cookieStore = await cookies();
    cookieStore.set(PENDING_INVITE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    redirect("/dashboard");
  }

  const result = await joinLeagueByInviteToken(me.id, token);
  if (!result.ok) {
    if (result.reason === "private_limit_reached") {
      return { status: "private_limit_reached", leagueName: result.leagueName };
    }
    if (result.reason === "league_full") {
      return {
        status: "league_full",
        leagueName: result.leagueName,
        limit: result.limit,
      };
    }
  }
  revalidatePath("/", "layout");
  // ?welcome=1 → el dashboard muestra el popup de bienvenida a la liga,
  // para que el usuario tenga confirmación explícita de que ya está dentro.
  redirect("/dashboard?welcome=1");
}

// ─────────────────── CREADOR DE QUINIELA PRIVADA ───────────────────

const updateSchema = z.object({
  id: z.coerce.number().int(),
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(NAME_MAX, `El nombre no puede pasar de ${NAME_MAX} caracteres.`),
});

/**
 * Actualiza el nombre y/o logo de una liga privada. Solo el creador
 * puede llamarlo (createdBy === me.id). Si llega un nuevo logo, se
 * sube a `leagues/<id>.png|jpg` (upsert sobre el path estable). Si
 * no se sube logo, se preserva el actual.
 */
export async function updateLeague(
  _prev: LeagueFormState,
  formData: FormData,
): Promise<LeagueFormState> {
  const me = await requireUser();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [target] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, parsed.data.id))
    .limit(1);
  if (!target) return { ok: false, error: "Liga no encontrada." };
  if (target.isPublic) {
    return { ok: false, error: "La quiniela pública no se puede editar." };
  }
  if (!canManageLeague(me, target)) {
    return { ok: false, error: "No tienes permiso para editar esta quiniela." };
  }

  const update: Record<string, unknown> = { name: parsed.data.name };

  // Logo: la galería preset siempre está disponible. El upload custom
  // solo si la liga tiene un Pase Mundial 2026 (tier != free). Si llegan
  // ambos campos, el custom gana (premium quería sobreescribir).
  const presetId = formData.get("logoPresetId");
  if (typeof presetId === "string" && presetId.length > 0) {
    const presetUrl = presetUrlById(presetId);
    if (presetUrl) update.logoUrl = presetUrl;
  }

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!isPremiumTier(target.tier)) {
      return {
        ok: false,
        error:
          "Subir un logo corporativo está incluido en los Pases Mundial 2026. Mientras tanto, elige uno de la galería o contáctanos en /precios.",
      };
    }
    if (logo.size > MAX_LOGO_BYTES) {
      return { ok: false, error: "El logo es demasiado grande." };
    }
    const ext = logo.type === "image/png" ? "png" : "jpg";
    const path = `${target.id}.${ext}`;
    update.logoUrl = await uploadImage({ kind: "league", path, file: logo });
  }

  await db.update(leagues).set(update).where(eq(leagues.id, target.id));

  revalidatePath("/mi-quiniela");
  revalidatePath("/", "layout");
  return { ok: true, message: "Quiniela actualizada." };
}

/**
 * Borra una quiniela privada. Solo la puede llamar el creador (createdBy).
 * Misma mecánica que la versión admin: empuja a los miembros a la pública
 * antes del delete y deja que el cascade limpie las membresías.
 */
export async function deleteOwnLeague(formData: FormData) {
  const me = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;

  const [target] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
  if (!target) return;
  if (target.isPublic) return;
  if (target.createdBy !== me.id) return;

  const pub = await getPublicLeague();
  if (pub) {
    await db
      .update(profiles)
      .set({ leagueId: pub.id })
      .where(eq(profiles.leagueId, id));
  }

  await db.delete(leagues).where(eq(leagues.id, id));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * El creador echa a un miembro de su propia quiniela. No puede echarse a sí
 * mismo (para eso existe leaveLeague). Si el miembro tenía esta liga como
 * activa, le movemos a la pública.
 */
export async function kickFromOwnLeague(formData: FormData) {
  const me = await requireUser();
  const userId = String(formData.get("userId") ?? "");
  const leagueId = Number(formData.get("leagueId"));
  if (!userId || !Number.isFinite(leagueId)) return;

  const [target] = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!target) return;
  if (target.isPublic) return;
  if (!canManageLeague(me, target)) return;
  if (userId === me.id) return; // un gestor no se autoexpulsa

  await db
    .delete(leagueMemberships)
    .where(
      and(
        eq(leagueMemberships.userId, userId),
        eq(leagueMemberships.leagueId, leagueId),
      ),
    );

  const pub = await getPublicLeague();
  if (pub) {
    await db
      .update(profiles)
      .set({ leagueId: pub.id })
      .where(and(eq(profiles.id, userId), eq(profiles.leagueId, leagueId)));
  }

  revalidatePath("/mi-quiniela");
  revalidatePath("/", "layout");
}

const announcementSchema = z.object({
  id: z.coerce.number().int(),
  announcement: z
    .string()
    .trim()
    .max(280, "El anuncio no puede pasar de 280 caracteres."),
});

/**
 * Edita el anuncio fijado de una quiniela privada premium. Aparece como
 * banner en /mi-quiniela para todos los miembros. Solo el creador puede
 * cambiarlo y solo si la liga tiene un Pase Mundial 2026 activo. Un
 * string vacío limpia el anuncio.
 */
export async function updateLeagueAnnouncement(
  _prev: LeagueFormState,
  formData: FormData,
): Promise<LeagueFormState> {
  const me = await requireUser();
  const parsed = announcementSchema.safeParse({
    id: formData.get("id"),
    announcement: formData.get("announcement") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const [target] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, parsed.data.id))
    .limit(1);
  if (!target) return { ok: false, error: "Liga no encontrada." };
  if (!canManageLeague(me, target)) {
    return { ok: false, error: "No tienes permiso para editar el anuncio." };
  }
  if (!isPremiumTier(target.tier)) {
    return {
      ok: false,
      error:
        "El anuncio fijado forma parte de los Pases Mundial 2026. Mira /precios.",
    };
  }
  const value = parsed.data.announcement.length > 0 ? parsed.data.announcement : null;
  await db.update(leagues).set({ announcement: value }).where(eq(leagues.id, target.id));
  // El anuncio se pinta en el layout (visible en toda la liga), así que
  // revalidamos el layout completo, no solo /mi-quiniela.
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: value ? "Anuncio actualizado." : "Anuncio eliminado.",
  };
}

// ─────────────────── ADMIN ───────────────────

export async function deleteLeague(formData: FormData) {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  const [target] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
  if (!target || target.isPublic) return;

  // Mueve `profiles.leagueId` huérfanos a la pública para que no queden con
  // una liga activa que ya no existe. La FK con onDelete:set null también
  // cubre, pero forzamos pública para mantener invariante "todo profile
  // tiene una liga activa válida".
  const pub = await getPublicLeague();
  if (pub) {
    await db
      .update(profiles)
      .set({ leagueId: pub.id })
      .where(eq(profiles.leagueId, id));
  }

  // El cascade de la FK de league_memberships limpia las membresías.
  await db.delete(leagues).where(eq(leagues.id, id));
  await logAdminAction({ adminId: me.id, action: "league.delete", payload: { id } });
  revalidatePath("/admin/ligas");
  revalidatePath("/", "layout");
}

/**
 * Inscribe a un usuario a una liga (admin). Usado desde /admin/ligas/[id].
 * Idempotente. La liga pasa a ser activa para ese usuario.
 */
export async function moveUserToLeague(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const leagueRaw = formData.get("leagueId");
  if (!userId) return;
  const n = Number(leagueRaw);
  const leagueId = Number.isFinite(n) ? n : null;
  if (leagueId == null) return;

  await db
    .insert(leagueMemberships)
    .values({ userId, leagueId })
    .onConflictDoNothing();
  await db.update(profiles).set({ leagueId }).where(eq(profiles.id, userId));

  await logAdminAction({
    adminId: me.id,
    action: "league.add_member",
    payload: { userId, leagueId },
  });

  revalidatePath("/admin/ligas");
  revalidatePath(`/admin/ligas/${leagueId}`);
  revalidatePath("/", "layout");
}

/**
 * Quita una membership concreta. La liga activa del usuario pasa a la
 * pública si era la que se acaba de quitar.
 */
export async function removeMembership(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const leagueId = Number(formData.get("leagueId"));
  if (!userId || !Number.isFinite(leagueId)) return;
  const [target] = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!target || target.isPublic) return; // no se quita la pública

  await db
    .delete(leagueMemberships)
    .where(
      and(
        eq(leagueMemberships.userId, userId),
        eq(leagueMemberships.leagueId, leagueId),
      ),
    );

  // Si era su activa, fallback a la pública.
  const pub = await getPublicLeague();
  if (pub) {
    await db
      .update(profiles)
      .set({ leagueId: pub.id })
      .where(and(eq(profiles.id, userId), eq(profiles.leagueId, leagueId)));
  }

  await logAdminAction({
    adminId: me.id,
    action: "league.remove_member",
    payload: { userId, leagueId },
  });

  revalidatePath(`/admin/ligas/${leagueId}`);
  revalidatePath("/", "layout");
}

/**
 * Hard-delete del usuario. Borra el profile (cascades wipe predicciones,
 * puntos, chat) y borra también el `auth.users` row vía Supabase admin API
 * para invalidar la sesión. Sin cambios funcionales con respecto a la
 * versión single-league.
 */
export async function hardDeleteUser(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  if (userId === me.id) {
    throw new Error("No puedes eliminar tu propia cuenta de admin desde aquí.");
  }

  const [before] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);

  await db.delete(profiles).where(eq(profiles.id, userId));

  try {
    const supabase = createSupabaseServiceClient();
    await supabase.auth.admin.deleteUser(userId);
  } catch (err) {
    console.warn("supabase.auth.admin.deleteUser falló:", err);
  }

  await logAdminAction({
    adminId: me.id,
    action: "user.hard_delete",
    payload: { userId, leagueId: before?.leagueId ?? null },
  });

  revalidatePath("/admin/ligas");
  if (before?.leagueId != null) revalidatePath(`/admin/ligas/${before.leagueId}`);
  revalidatePath("/admin/usuarios");
  revalidatePath("/", "layout");
}

const VALID_TIERS = ["free", "team-50", "team-100", "team-250", "enterprise"] as const;
const upgradeSchema = z.object({
  id: z.coerce.number().int(),
  tier: z.enum(VALID_TIERS),
  memberLimit: z.coerce.number().int().min(1).max(10000).optional(),
  paidAmountEur: z.coerce.number().int().min(0).max(100000).optional(),
  paidVia: z.string().trim().max(40).optional().nullable(),
  markPaidNow: z.coerce.boolean().optional(),
});

/**
 * Admin override: cambia el tier y el `memberLimit` de una liga. Si el
 * admin marca "pagado ahora", también setea `paidAt`, `paidAmountEur` y
 * `paidVia`. Deja audit trail. Esta es la acción que se ejecuta tras
 * cobrar un Pase Mundial 2026 por PayPal.
 */
export async function upgradeLeague(
  _prev: LeagueFormState,
  formData: FormData,
): Promise<LeagueFormState> {
  const me = await requireAdmin();
  const parsed = upgradeSchema.safeParse({
    id: formData.get("id"),
    tier: formData.get("tier"),
    memberLimit: formData.get("memberLimit") || undefined,
    paidAmountEur: formData.get("paidAmountEur") || undefined,
    paidVia: formData.get("paidVia") || undefined,
    markPaidNow: formData.get("markPaidNow") === "on" || formData.get("markPaidNow") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [before] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, parsed.data.id))
    .limit(1);
  if (!before) return { ok: false, error: "Liga no encontrada." };
  if (before.isPublic) {
    return { ok: false, error: "La quiniela pública no admite tier." };
  }

  const update: Record<string, unknown> = { tier: parsed.data.tier };
  if (parsed.data.memberLimit != null) update.memberLimit = parsed.data.memberLimit;
  if (parsed.data.paidAmountEur != null) update.paidAmountEur = parsed.data.paidAmountEur;
  if (parsed.data.paidVia) update.paidVia = parsed.data.paidVia;
  if (parsed.data.markPaidNow) update.paidAt = new Date();

  await db.update(leagues).set(update).where(eq(leagues.id, before.id));

  await logAdminAction({
    adminId: me.id,
    action: "league.upgrade",
    payload: {
      leagueId: before.id,
      from: {
        tier: before.tier,
        memberLimit: before.memberLimit,
        paidAmountEur: before.paidAmountEur,
      },
      to: {
        tier: parsed.data.tier,
        memberLimit: update.memberLimit ?? before.memberLimit,
        paidAmountEur: update.paidAmountEur ?? before.paidAmountEur,
        paidVia: update.paidVia ?? before.paidVia,
      },
    },
  });

  revalidatePath("/admin/ligas");
  revalidatePath(`/admin/ligas/${before.id}`);
  revalidatePath("/mi-quiniela");
  return { ok: true, message: "Plan actualizado." };
}

const changeModeSchema = z.object({
  id: z.coerce.number().int(),
  mode: z.enum(["completo", "marcador", "solo_ganador"]),
});

/**
 * Admin override: cambia el modo de predicción de una liga privada ya
 * creada (p. ej. un cliente que pidió pasar de "Completo" a "Solo Ganador").
 *
 * El modo controla qué categorías ve el usuario y bajo qué ranking global
 * compite la liga. No reescribe el `points_ledger`: los puntos ya anotados
 * de categorías que el nuevo modo oculta seguirían sumando hasta el próximo
 * recálculo. En la práctica esto solo importa si se cambia con el torneo ya
 * empezado y con resultados cargados; antes del arranque es un no-op de datos.
 * Por eso el form muestra un aviso cuando el cambio se hace en caliente.
 */
export async function changeLeagueMode(
  _prev: LeagueFormState,
  formData: FormData,
): Promise<LeagueFormState> {
  const me = await requireAdmin();
  const parsed = changeModeSchema.safeParse({
    id: formData.get("id"),
    mode: formData.get("mode"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [before] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, parsed.data.id))
    .limit(1);
  if (!before) return { ok: false, error: "Liga no encontrada." };
  if (before.isPublic) {
    return { ok: false, error: "El modo de la quiniela pública no se puede cambiar." };
  }
  if (before.predictionMode === parsed.data.mode) {
    return { ok: false, error: "La liga ya está en ese modo." };
  }

  await db
    .update(leagues)
    .set({ predictionMode: parsed.data.mode })
    .where(eq(leagues.id, before.id));

  await logAdminAction({
    adminId: me.id,
    action: "league.change_mode",
    payload: {
      leagueId: before.id,
      from: before.predictionMode,
      to: parsed.data.mode,
    },
  });

  revalidatePath("/admin/ligas");
  revalidatePath(`/admin/ligas/${before.id}`);
  revalidatePath("/mi-quiniela");
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: `Modo cambiado a "${PREDICTION_MODE_META[parsed.data.mode].label}".`,
  };
}

const VALID_LEAD_STATUS = ["new", "contacted", "won", "lost"] as const;
const leadUpdateSchema = z.object({
  id: z.coerce.number().int(),
  status: z.enum(VALID_LEAD_STATUS),
  notes: z.string().trim().max(2000).optional().nullable(),
});

/** Admin: actualiza el estado/notas de un lead comercial. */
export async function updateCommercialLead(
  _prev: LeagueFormState,
  formData: FormData,
): Promise<LeagueFormState> {
  const me = await requireAdmin();
  const parsed = leadUpdateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  await db
    .update(commercialLeads)
    .set({
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(commercialLeads.id, parsed.data.id));
  await logAdminAction({
    adminId: me.id,
    action: "lead.update",
    payload: { id: parsed.data.id, status: parsed.data.status },
  });
  revalidatePath("/admin/leads");
  return { ok: true, message: "Lead actualizado." };
}

// ──────────────── Flujo "pagar antes de crear" (planes de pago) ────────────────

const PAID_MODE_VALUES = ["completo", "marcador", "solo_ganador"] as const;

const startPaidSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(NAME_MAX, `El nombre no puede pasar de ${NAME_MAX} caracteres.`),
  mode: z.enum(PAID_MODE_VALUES).default("completo"),
  logoPresetId: z.string().nullable().optional(),
  tier: z.enum(["team-50", "team-100", "team-250"]),
});

export type StartPaidCheckoutResult =
  | { ok: true; transactionId: string }
  | { ok: false; error: string };

/**
 * Crea una transaction de Paddle para un plan de pago SIN crear todavía la
 * liga: los datos de la liga viajan en `customData` y la liga se materializa
 * al confirmarse el pago (vía `finalizePaidLeague` o el webhook). Valida el
 * tope de privadas (admins exentos) ANTES de cobrar.
 */
export async function startPaidLeagueCheckout(input: {
  name: string;
  mode: string;
  logoPresetId: string | null;
  tier: string;
}): Promise<StartPaidCheckoutResult> {
  const me = await requireUser();
  const parsed = startPaidSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const privateCount = await countPrivateMemberships(me.id);
  if (me.role !== "admin" && privateCount >= PRIVATE_LEAGUES_PER_USER_LIMIT) {
    return { ok: false, error: PRIVATE_LIMIT_ERROR };
  }

  const paddle = getPaddleClient();
  const priceId = paddlePriceIdForTier(parsed.data.tier);
  if (!paddle || !priceId) {
    return {
      ok: false,
      error:
        "El pago no está disponible ahora mismo. Crea la quiniela en Estándar y amplíala luego desde Mi Quiniela.",
    };
  }

  const logoUrl =
    (parsed.data.logoPresetId ? presetUrlById(parsed.data.logoPresetId) : null) ??
    DEFAULT_PRESET_LOGO_URL;

  try {
    const tx = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customData: {
        create_league: "1",
        tier: parsed.data.tier,
        user_id: me.id,
        user_email: me.email,
        league_name: parsed.data.name,
        league_mode: parsed.data.mode,
        league_logo: logoUrl,
      },
    });
    if (!tx.id) return { ok: false, error: "No se pudo iniciar el pago." };
    return { ok: true, transactionId: tx.id };
  } catch (err) {
    console.error("[paddle] startPaidLeagueCheckout failed", err);
    return { ok: false, error: "No se pudo iniciar el pago. Inténtalo de nuevo." };
  }
}

export type FinalizePaidLeagueResult =
  | {
      ok: true;
      league: { name: string; joinCode: string | null; inviteToken: string };
    }
  | { ok: false; error: string };

/**
 * Tras `checkout.completed` en el overlay, el cliente llama aquí con la
 * transactionId. Verificamos contra Paddle que el pago está confirmado y que
 * la transaction es de ESTE usuario, y creamos la liga ya pagada (idempotente
 * vía `paidTxId`; el webhook es el respaldo).
 */
export async function finalizePaidLeague(
  transactionId: string,
): Promise<FinalizePaidLeagueResult> {
  const me = await requireUser();
  if (!transactionId) return { ok: false, error: "Transacción inválida." };

  const paddle = getPaddleClient();
  if (!paddle) return { ok: false, error: "Pago no disponible." };

  let tx;
  try {
    tx = await paddle.transactions.get(transactionId);
  } catch (err) {
    console.error("[paddle] finalizePaidLeague get failed", err);
    return { ok: false, error: "No se pudo verificar el pago." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tx as any;
  const status: string = t.status ?? "";
  if (status !== "completed" && status !== "paid") {
    return { ok: false, error: "El pago aún no está confirmado." };
  }
  const cd: Record<string, string> = t.customData ?? {};
  if (cd.create_league !== "1" || cd.user_id !== me.id) {
    return { ok: false, error: "Esta transacción no corresponde a tu cuenta." };
  }
  if (!isPaidTier(cd.tier ?? "")) {
    return { ok: false, error: "Plan inválido." };
  }
  const tier = cd.tier as PaidTierId;
  const mode = (
    (PAID_MODE_VALUES as readonly string[]).includes(cd.league_mode ?? "")
      ? cd.league_mode
      : "completo"
  ) as PredictionMode;
  const subtotalMinor = Number(t.details?.totals?.subtotal ?? 0) || 0;
  const paidAmountEur = Math.round(subtotalMinor / 100);

  const res = await createPaidLeagueFromTransaction({
    txId: transactionId,
    userId: me.id,
    tier,
    name: cd.league_name?.slice(0, NAME_MAX) || "Mi quiniela",
    mode,
    logoUrl: cd.league_logo || DEFAULT_PRESET_LOGO_URL,
    paidAmountEur,
  });

  if (res.created) {
    after(() =>
      notifyNewPrivateLeague({
        id: res.leagueId,
        name: res.leagueName,
        joinCode: res.joinCode,
        creatorEmail: me.email,
        modeLabel: PREDICTION_MODE_META[mode].label,
        planLabel: TIER_LABEL[tier],
      }),
    );
  }

  revalidatePath("/admin/ligas");
  revalidatePath("/", "layout");
  return {
    ok: true,
    league: {
      name: res.leagueName,
      joinCode: res.joinCode,
      inviteToken: res.inviteToken,
    },
  };
}

// ─────────────────── BRANDING (premium) ───────────────────

const MAX_BRAND_BYTES = 2 * 1024 * 1024; // 2 MB — el cliente ya recorta a PNG pequeño.

type ImgResult = { ok: boolean; error?: string; url?: string };

/** Valida que `me` puede gestionar el branding de una liga premium (owner o
 * co-admin). Devuelve la liga o un error. */
async function requireOwnerPremiumLeague(
  leagueId: number,
  me: { id: string; role: "user" | "admin" },
): Promise<{ tier: string } | { error: string }> {
  const [target] = await db
    .select({ createdBy: leagues.createdBy, tier: leagues.tier, isPublic: leagues.isPublic })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!target) return { error: "Liga no encontrada." };
  if (!canManageLeague(me, target)) return { error: "No tienes permiso para editar el branding." };
  if (!canUseBranding(target.tier)) {
    return { error: "El branding personalizado está disponible a partir del Pase Empresa (100)." };
  }
  return { tier: target.tier };
}

/**
 * Sube el logo CUADRADO de la liga (premium). Recibe un PNG ya recortado por el
 * cliente (LogoCropDialog). Lo guarda en `leagues.logoUrl`.
 */
export async function uploadLeagueSquareLogo(formData: FormData): Promise<ImgResult> {
  const me = await requireUser();
  const id = Number(formData.get("id"));
  const file = formData.get("logo");
  if (!Number.isFinite(id)) return { ok: false, error: "Liga inválida." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Falta la imagen." };
  if (file.size > MAX_BRAND_BYTES) return { ok: false, error: "La imagen es demasiado grande." };
  const limited = await rateLimit(`league-logo:${me.id}`, 10, 60_000);
  if (!limited.ok) return { ok: false, error: "Demasiados intentos. Espera un momento." };
  const guard = await requireOwnerPremiumLeague(id, me);
  if ("error" in guard) return { ok: false, error: guard.error };
  try {
    const url = await uploadImage({ kind: "league", path: `${id}.png`, file });
    // URL versionada: el path no cambia (upsert), así que sin esto el navegador
    // y el CDN servirían la imagen anterior hasta un hard refresh.
    const versioned = `${url}?v=${Date.now()}`;
    await db.update(leagues).set({ logoUrl: versioned }).where(eq(leagues.id, id));
    revalidatePath("/mi-quiniela");
    revalidatePath("/", "layout");
    return { ok: true, url: versioned };
  } catch {
    return { ok: false, error: "No se pudo subir el logo. Reinténtalo." };
  }
}

/**
 * Sube el logo de MARCA (premium) — sustituye el wordmark "Quiniela Mundial" en
 * el shell para todos los miembros. PNG rectangular ya recortado por el cliente.
 */
export async function uploadLeagueBrandLogo(formData: FormData): Promise<ImgResult> {
  const me = await requireUser();
  const id = Number(formData.get("id"));
  const file = formData.get("logo");
  if (!Number.isFinite(id)) return { ok: false, error: "Liga inválida." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Falta la imagen." };
  if (file.size > MAX_BRAND_BYTES) return { ok: false, error: "La imagen es demasiado grande." };
  const limited = await rateLimit(`league-brand:${me.id}`, 10, 60_000);
  if (!limited.ok) return { ok: false, error: "Demasiados intentos. Espera un momento." };
  const guard = await requireOwnerPremiumLeague(id, me);
  if ("error" in guard) return { ok: false, error: guard.error };
  try {
    const url = await uploadImage({ kind: "league", path: `${id}-brand.png`, file });
    // URL versionada (ver uploadLeagueSquareLogo) → invalida caché tras re-subir.
    const versioned = `${url}?v=${Date.now()}`;
    await db.update(leagues).set({ brandLogoUrl: versioned }).where(eq(leagues.id, id));
    revalidatePath("/mi-quiniela");
    revalidatePath("/", "layout");
    return { ok: true, url: versioned };
  } catch {
    return { ok: false, error: "No se pudo subir la marca. Reinténtalo." };
  }
}

/** Quita el logo de marca → vuelve al branding de Quiniela Mundial. */
export async function removeLeagueBrandLogo(formData: FormData): Promise<ImgResult> {
  const me = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { ok: false, error: "Liga inválida." };
  const guard = await requireOwnerPremiumLeague(id, me);
  if ("error" in guard) return { ok: false, error: guard.error };
  await db
    .update(leagues)
    .set({ brandLogoUrl: null, brandLogoLightUrl: null })
    .where(eq(leagues.id, id));
  // Borrado best-effort de los ficheros (no bloqueante para la UX).
  try {
    await deleteImage({ kind: "league", path: `${id}-brand.png` });
    await deleteImage({ kind: "league", path: `${id}-brand-light.png` });
  } catch {
    /* los ficheros pueden no existir; da igual */
  }
  revalidatePath("/mi-quiniela");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Sube la variante de la MARCA para TEMA CLARO (premium, opcional). Si existe,
 * el shell la usa en tema claro; si no, se usa `brandLogoUrl` en ambos.
 */
export async function uploadLeagueBrandLightLogo(formData: FormData): Promise<ImgResult> {
  const me = await requireUser();
  const id = Number(formData.get("id"));
  const file = formData.get("logo");
  if (!Number.isFinite(id)) return { ok: false, error: "Liga inválida." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Falta la imagen." };
  if (file.size > MAX_BRAND_BYTES) return { ok: false, error: "La imagen es demasiado grande." };
  const limited = await rateLimit(`league-brand:${me.id}`, 10, 60_000);
  if (!limited.ok) return { ok: false, error: "Demasiados intentos. Espera un momento." };
  const guard = await requireOwnerPremiumLeague(id, me);
  if ("error" in guard) return { ok: false, error: guard.error };
  try {
    const url = await uploadImage({ kind: "league", path: `${id}-brand-light.png`, file });
    const versioned = `${url}?v=${Date.now()}`;
    await db.update(leagues).set({ brandLogoLightUrl: versioned }).where(eq(leagues.id, id));
    revalidatePath("/mi-quiniela");
    revalidatePath("/", "layout");
    return { ok: true, url: versioned };
  } catch {
    return { ok: false, error: "No se pudo subir la marca. Reinténtalo." };
  }
}

/** Quita SOLO la variante de tema claro → se vuelve a usar la marca única. */
export async function removeLeagueBrandLightLogo(formData: FormData): Promise<ImgResult> {
  const me = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { ok: false, error: "Liga inválida." };
  const guard = await requireOwnerPremiumLeague(id, me);
  if ("error" in guard) return { ok: false, error: guard.error };
  await db.update(leagues).set({ brandLogoLightUrl: null }).where(eq(leagues.id, id));
  try {
    await deleteImage({ kind: "league", path: `${id}-brand-light.png` });
  } catch {
    /* puede no existir */
  }
  revalidatePath("/mi-quiniela");
  revalidatePath("/", "layout");
  return { ok: true };
}
