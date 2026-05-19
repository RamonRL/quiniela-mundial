"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { leagueMemberships, leagues, profiles } from "@/lib/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin/audit";
import { notifyNewPrivateLeague } from "@/lib/telegram/events";
import {
  PENDING_INVITE_COOKIE,
  PRIVATE_LEAGUES_PER_USER_LIMIT,
  countPrivateMemberships,
  generateUniqueJoinCode,
  getPublicLeague,
  isMemberOf,
  joinLeagueByInviteToken,
} from "@/lib/leagues";

export type LeagueFormState = { ok: boolean; error?: string; message?: string };

function slugify(input: string): string {
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

const PRIVATE_LIMIT_ERROR = `Tienes ${PRIVATE_LEAGUES_PER_USER_LIMIT} quinielas privadas. Para unirte a una nueva, abandona alguna desde tu perfil.`;

const NAME_MAX = 25;
const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(NAME_MAX, `El nombre no puede pasar de ${NAME_MAX} caracteres.`),
});

export type CreateLeagueResult = LeagueFormState & {
  league?: {
    id: number;
    name: string;
    slug: string;
    joinCode: string | null;
    inviteToken: string;
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
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const privateCount = await countPrivateMemberships(me.id);
  if (privateCount >= PRIVATE_LEAGUES_PER_USER_LIMIT) {
    return { ok: false, error: PRIVATE_LIMIT_ERROR };
  }

  // Slug único: si choca, sufijo aleatorio.
  const baseSlug = slugify(parsed.data.name);
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
      name: parsed.data.name,
      inviteToken,
      joinCode,
      isPublic: false,
      createdBy: me.id,
    })
    .returning();

  // Auto-inscribir al creador y ponerla como activa.
  await db
    .insert(leagueMemberships)
    .values({ userId: me.id, leagueId: created.id })
    .onConflictDoNothing();
  await db
    .update(profiles)
    .set({ leagueId: created.id })
    .where(eq(profiles.id, me.id));

  if (me.role === "admin") {
    await logAdminAction({
      adminId: me.id,
      action: "league.create",
      payload: { id: created.id, slug },
    });
  }

  // Alerta Telegram fire-and-forget.
  void notifyNewPrivateLeague({
    id: created.id,
    name: created.name,
    joinCode: created.joinCode,
    creatorEmail: me.email,
  });

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

  const privateCount = await countPrivateMemberships(me.id);
  if (privateCount >= PRIVATE_LEAGUES_PER_USER_LIMIT) {
    return { ok: false, error: PRIVATE_LIMIT_ERROR };
  }

  await db
    .insert(leagueMemberships)
    .values({ userId: me.id, leagueId: league.id })
    .onConflictDoNothing();
  await db
    .update(profiles)
    .set({ leagueId: league.id })
    .where(eq(profiles.id, me.id));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Cambia la liga activa del usuario. Valida que sea miembro.
 */
export async function setActiveLeague(formData: FormData) {
  const me = await requireUser();
  const id = Number(formData.get("leagueId"));
  if (!Number.isFinite(id)) return;
  const member = await isMemberOf(me.id, id);
  if (!member) return;
  await db.update(profiles).set({ leagueId: id }).where(eq(profiles.id, me.id));
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
    | "private_limit_reached";
  leagueName?: string;
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
  if (!result.ok && result.reason === "private_limit_reached") {
    return { status: "private_limit_reached", leagueName: result.leagueName };
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// ─────────────────── CREADOR DE QUINIELA PRIVADA ───────────────────

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
  if (target.createdBy !== me.id) return;
  if (userId === me.id) return; // el creador no se autoexpulsa

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
