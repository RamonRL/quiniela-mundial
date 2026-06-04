"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  leagueDepartments,
  leagueMemberships,
  leagues,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { canUseDepartments } from "@/lib/league-tiers";
import { logAdminAction } from "@/lib/admin/audit";

export type DepartmentFormState = {
  ok: boolean;
  error?: string;
  message?: string;
};

const MAX_NAME = 40;
const MAX_EMOJI = 8;

const createSchema = z.object({
  leagueId: z.coerce.number().int(),
  name: z
    .string()
    .trim()
    .min(1, "Pon un nombre")
    .max(MAX_NAME, `Máximo ${MAX_NAME} caracteres.`),
  emoji: z.string().trim().max(MAX_EMOJI).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #RRGGBB.")
    .optional(),
});

/**
 * Comprueba que la liga existe, no es pública, está en plan pago activo y
 * el usuario es el creador. Devuelve la liga o un error como string.
 * Centraliza el chequeo en un sitio para no repetirlo en cada acción.
 */
async function requireDeptAdmin(
  meId: string,
  leagueId: number,
): Promise<{ league: typeof leagues.$inferSelect } | { error: string }> {
  if (!Number.isFinite(leagueId)) return { error: "Liga inválida." };
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) return { error: "Liga no encontrada." };
  if (league.isPublic) return { error: "La quiniela pública no usa departamentos." };
  if (league.createdBy !== meId) {
    return { error: "Solo el creador puede gestionar departamentos." };
  }
  if (!canUseDepartments(league.tier)) {
    return {
      error:
        "Los departamentos requieren un Pase Mundial 2026 (Plan 50, 100 o 250). Mira /precios.",
    };
  }
  return { league };
}

export async function createDepartment(
  _prev: DepartmentFormState,
  formData: FormData,
): Promise<DepartmentFormState> {
  const me = await requireUser();
  const parsed = createSchema.safeParse({
    leagueId: formData.get("leagueId"),
    name: formData.get("name"),
    emoji: formData.get("emoji") || undefined,
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const guard = await requireDeptAdmin(me.id, parsed.data.leagueId);
  if ("error" in guard) return { ok: false, error: guard.error };

  try {
    await db.insert(leagueDepartments).values({
      leagueId: parsed.data.leagueId,
      name: parsed.data.name,
      emoji: parsed.data.emoji ?? null,
      color: parsed.data.color ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("league_departments_league_name_idx")) {
      return { ok: false, error: "Ya existe un departamento con ese nombre." };
    }
    throw err;
  }

  await logAdminAction({
    adminId: me.id,
    action: "league.department.create",
    payload: { leagueId: parsed.data.leagueId, name: parsed.data.name },
  });

  revalidatePath("/mi-quiniela/departamentos");
  revalidatePath("/ranking");
  return { ok: true, message: "Departamento creado." };
}

const updateSchema = z.object({
  deptId: z.coerce.number().int(),
  name: z.string().trim().min(1).max(MAX_NAME),
  // Emoji y color son nullables y se pueden borrar pasando string vacío.
  // El preprocess los convierte a null cuando llegan "" desde el form.
  emoji: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(MAX_EMOJI).nullable().optional(),
  ),
  color: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #RRGGBB.")
      .nullable()
      .optional(),
  ),
});

/**
 * Actualiza nombre, emoji y color de un departamento existente. Todos
 * los campos opcionales salvo el nombre — pasar "" en emoji o color
 * limpia el valor (NULL en DB).
 */
export async function updateDepartment(
  _prev: DepartmentFormState,
  formData: FormData,
): Promise<DepartmentFormState> {
  const me = await requireUser();
  const parsed = updateSchema.safeParse({
    deptId: formData.get("deptId"),
    name: formData.get("name"),
    emoji: formData.get("emoji"),
    color: formData.get("color"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [dept] = await db
    .select()
    .from(leagueDepartments)
    .where(eq(leagueDepartments.id, parsed.data.deptId))
    .limit(1);
  if (!dept) return { ok: false, error: "Departamento no encontrado." };

  const guard = await requireDeptAdmin(me.id, dept.leagueId);
  if ("error" in guard) return { ok: false, error: guard.error };

  try {
    await db
      .update(leagueDepartments)
      .set({
        name: parsed.data.name,
        emoji: parsed.data.emoji ?? null,
        color: parsed.data.color ?? null,
      })
      .where(eq(leagueDepartments.id, parsed.data.deptId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("league_departments_league_name_idx")) {
      return { ok: false, error: "Ya existe un departamento con ese nombre." };
    }
    throw err;
  }

  revalidatePath("/mi-quiniela/departamentos");
  revalidatePath("/ranking");
  return { ok: true, message: "Departamento actualizado." };
}

export async function deleteDepartment(formData: FormData) {
  const me = await requireUser();
  const deptId = Number(formData.get("deptId"));
  if (!Number.isFinite(deptId)) return;

  const [dept] = await db
    .select()
    .from(leagueDepartments)
    .where(eq(leagueDepartments.id, deptId))
    .limit(1);
  if (!dept) return;

  const guard = await requireDeptAdmin(me.id, dept.leagueId);
  if ("error" in guard) return;

  // El FK ON DELETE SET NULL en league_memberships.departmentId hace que
  // los miembros pasen automáticamente a "sin departamento".
  await db.delete(leagueDepartments).where(eq(leagueDepartments.id, deptId));

  await logAdminAction({
    adminId: me.id,
    action: "league.department.delete",
    payload: { leagueId: dept.leagueId, name: dept.name },
  });

  revalidatePath("/mi-quiniela/departamentos");
  revalidatePath("/ranking");
}

const assignSchema = z.object({
  leagueId: z.coerce.number().int(),
  userId: z.string().uuid(),
  // departmentId puede ser número o cadena vacía ("") = quitar dept.
  deptId: z.preprocess(
    (v) => (v === "" || v == null || v === "0" ? null : v),
    z.coerce.number().int().nullable(),
  ),
});

export async function assignMemberToDepartment(
  formData: FormData,
): Promise<DepartmentFormState> {
  const me = await requireUser();
  const parsed = assignSchema.safeParse({
    leagueId: formData.get("leagueId"),
    userId: formData.get("userId"),
    deptId: formData.get("deptId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const guard = await requireDeptAdmin(me.id, parsed.data.leagueId);
  if ("error" in guard) return { ok: false, error: guard.error };

  // Si el deptId no es null, validamos que ese departamento PERTENECE a la
  // misma liga — evitar que el admin asigne a un dept. de otra liga por
  // error (o malicia).
  if (parsed.data.deptId != null) {
    const [dept] = await db
      .select({ id: leagueDepartments.id, leagueId: leagueDepartments.leagueId })
      .from(leagueDepartments)
      .where(eq(leagueDepartments.id, parsed.data.deptId))
      .limit(1);
    if (!dept || dept.leagueId !== parsed.data.leagueId) {
      return { ok: false, error: "El departamento no pertenece a esta liga." };
    }
  }

  // Confirmar que el user está realmente en esa liga.
  const [membership] = await db
    .select()
    .from(leagueMemberships)
    .where(
      and(
        eq(leagueMemberships.userId, parsed.data.userId),
        eq(leagueMemberships.leagueId, parsed.data.leagueId),
      ),
    )
    .limit(1);
  if (!membership) {
    return { ok: false, error: "El usuario no es miembro de esta liga." };
  }

  await db
    .update(leagueMemberships)
    .set({ departmentId: parsed.data.deptId })
    .where(
      and(
        eq(leagueMemberships.userId, parsed.data.userId),
        eq(leagueMemberships.leagueId, parsed.data.leagueId),
      ),
    );

  revalidatePath("/mi-quiniela/departamentos");
  revalidatePath("/ranking");
  return { ok: true };
}

/**
 * El propio MIEMBRO elige su departamento (una sola vez — queda bloqueado;
 * después solo el admin puede moverlo desde la tab Miembros). No requiere ser
 * owner: solo ser miembro de la liga, con la feature activa.
 */
export async function selfAssignDepartment(
  formData: FormData,
): Promise<DepartmentFormState> {
  const me = await requireUser();
  const leagueId = Number(formData.get("leagueId"));
  const deptId = Number(formData.get("deptId"));
  if (!Number.isFinite(leagueId) || !Number.isFinite(deptId)) {
    return { ok: false, error: "Datos inválidos." };
  }

  const [league] = await db
    .select({ id: leagues.id, isPublic: leagues.isPublic, tier: leagues.tier })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league || league.isPublic) return { ok: false, error: "Liga no encontrada." };
  if (!canUseDepartments(league.tier)) {
    return { ok: false, error: "Esta quiniela no tiene departamentos activos." };
  }

  // Debe ser miembro y NO tener departamento aún (elección única).
  const [membership] = await db
    .select({ departmentId: leagueMemberships.departmentId })
    .from(leagueMemberships)
    .where(
      and(
        eq(leagueMemberships.leagueId, leagueId),
        eq(leagueMemberships.userId, me.id),
      ),
    )
    .limit(1);
  if (!membership) return { ok: false, error: "No eres miembro de esta quiniela." };
  if (membership.departmentId != null) {
    return {
      ok: false,
      error: "Ya tienes equipo. Solo el admin puede cambiarte de departamento.",
    };
  }

  // El departamento debe pertenecer a ESTA liga.
  const [dept] = await db
    .select({ id: leagueDepartments.id })
    .from(leagueDepartments)
    .where(
      and(
        eq(leagueDepartments.id, deptId),
        eq(leagueDepartments.leagueId, leagueId),
      ),
    )
    .limit(1);
  if (!dept) return { ok: false, error: "Departamento no encontrado." };

  await db
    .update(leagueMemberships)
    .set({ departmentId: deptId })
    .where(
      and(
        eq(leagueMemberships.leagueId, leagueId),
        eq(leagueMemberships.userId, me.id),
      ),
    );
  revalidatePath("/mi-quiniela");
  return { ok: true };
}
