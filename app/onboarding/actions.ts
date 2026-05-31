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

/**
 * Onboarding paso "perfil": primer login. Guardamos apodo (por defecto la
 * primera parte del email) y, opcionalmente, avatar. Tras esto el usuario
 * pasa al chooser de liga.
 */
export async function saveInitialProfile(
  _prev: SaveInitialProfileState,
  formData: FormData,
): Promise<SaveInitialProfileState> {
  const me = await requireUser();

  const raw = (formData.get("nickname") ?? "").toString().trim();
  const nickname = raw.length > 0 ? raw.slice(0, 40) : me.email.split("@")[0];

  const update: Record<string, unknown> = { nickname };

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > MAX_AVATAR_BYTES) {
      return { ok: false, error: "La imagen es demasiado grande." };
    }
    update.avatarUrl = await uploadImage({
      kind: "avatar",
      path: `${me.id}.png`,
      file: avatar,
    });
  }

  await db.update(profiles).set(update).where(eq(profiles.id, me.id));
  revalidatePath("/", "layout");
  redirect("/onboarding");
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
