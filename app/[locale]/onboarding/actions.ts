"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueMemberships, profiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import {
  getPublicLeagueByMode,
  isMemberOf,
  isPredictionMode,
} from "@/lib/leagues";
import { uploadImage } from "@/lib/storage";

export type SaveInitialProfileState = { ok: boolean; error?: string };

// Tope de seguridad en servidor. El cliente comprime el avatar a
// ~100-200 KB con `compressImage` antes de subirlo (mismo pipeline
// que `/perfil`), así que 2 MB sobra de margen y solo actúa de
// fallback si un cliente raro saltase la compresión.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Propaga `?next=` a través de los redirects del onboarding. */
function withNext(path: string, next: string | null): string {
  if (!next) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}next=${encodeURIComponent(next)}`;
}

/**
 * Onboarding, paso 1 del perfil (primer login): solo el apodo. Por defecto,
 * la primera parte del email. Tras guardarlo, pasamos al paso 2 (la foto),
 * que es opcional — separarlos evita que la gente se olvide de la foto.
 */
export async function saveInitialNickname(
  _prev: SaveInitialProfileState,
  formData: FormData,
): Promise<SaveInitialProfileState> {
  const me = await requireUser();
  const next = (formData.get("next") ?? "").toString() || null;

  const raw = (formData.get("nickname") ?? "").toString().trim();
  const nickname = raw.length > 0 ? raw.slice(0, 40) : me.email.split("@")[0];

  await db.update(profiles).set({ nickname }).where(eq(profiles.id, me.id));
  revalidatePath("/", "layout");
  redirect(withNext("/onboarding?step=foto", next));
}

/**
 * Onboarding, paso 2 del perfil: la foto (opcional). Si llega un archivo lo
 * subimos; si no, no toca nada. Después:
 *  - Si el usuario YA tiene liga (entró por invite link → la cookie se
 *    consumió al crear el perfil), va directo al dashboard con el popup
 *    de bienvenida. Antes se le mandaba al chooser de liga y parecía que
 *    el invite no había servido de nada.
 *  - Si no tiene liga, sigue al chooser como siempre.
 * El botón "Saltar" del cliente navega directo sin llamar a esta acción
 * (misma bifurcación, calculada en el cliente con `fresh`).
 */
export async function saveInitialAvatar(
  _prev: SaveInitialProfileState,
  formData: FormData,
): Promise<SaveInitialProfileState> {
  const me = await requireUser();
  const next = (formData.get("next") ?? "").toString() || null;

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > MAX_AVATAR_BYTES) {
      return { ok: false, error: "La imagen es demasiado grande." };
    }
    const avatarUrl = await uploadImage({
      kind: "avatar",
      path: `${me.id}.png`,
      file: avatar,
    });
    await db.update(profiles).set({ avatarUrl }).where(eq(profiles.id, me.id));
    revalidatePath("/", "layout");
  }

  if (!next && me.leagueId != null) {
    redirect("/dashboard?welcome=1");
  }
  redirect(withNext("/onboarding", next));
}

/**
 * El usuario se une (o reactiva) a una de las 3 quinielas públicas, elegida
 * por su modo de predicción, y la deja como liga activa. Entrar a una
 * pública es ahora explícito (ya no se auto-inscribe a nadie). Un usuario
 * puede estar en las 3 públicas a la vez si quiere.
 */
export async function joinPublicByMode(modeRaw: string) {
  const me = await requireUser();
  if (!isPredictionMode(modeRaw)) {
    throw new Error(`Modo de quiniela pública inválido: ${modeRaw}`);
  }
  const pub = await getPublicLeagueByMode(modeRaw);
  if (!pub) {
    throw new Error(`La quiniela pública de modo ${modeRaw} no existe en la BD.`);
  }
  const already = await isMemberOf(me.id, pub.id);
  if (!already) {
    await db
      .insert(leagueMemberships)
      .values({ userId: me.id, leagueId: pub.id })
      .onConflictDoNothing();
  }
  await db.update(profiles).set({ leagueId: pub.id }).where(eq(profiles.id, me.id));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
