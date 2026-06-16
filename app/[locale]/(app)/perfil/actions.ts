"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { deleteImage, uploadImage } from "@/lib/storage";
import { runAction } from "@/lib/actions/guard";
import { rateLimit } from "@/lib/ratelimit";

export type FormState = { ok: boolean; error?: string };

/** Extrae la ruta dentro del bucket `avatars` de una URL pública (o null). */
function avatarStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/object/public/avatars/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length).split("?")[0] || null;
}

const nicknameSchema = z
  .string()
  .max(40)
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : null));

/**
 * Solo apodo. La foto se guarda de forma independiente al confirmar el
 * crop (`uploadAvatar`) para que el botón "Guardar" no sea necesario
 * cuando el usuario solo quiere actualizar la imagen.
 */
export async function updateNickname(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const parsed = nicknameSchema.safeParse(formData.get("nickname") ?? "");
  if (!parsed.success) {
    return { ok: false, error: "Apodo inválido (máx 40 chars)." };
  }
  return runAction(
    { action: "updateNickname", userId: me.id },
    async () => {
      await db
        .update(profiles)
        .set({ nickname: parsed.data })
        .where(eq(profiles.id, me.id));
      revalidatePath("/perfil");
      revalidatePath("/dashboard");
      revalidatePath("/ranking");
      return { ok: true };
    },
    (error) => ({ ok: false, error }),
  );
}

/**
 * Sube la foto recortada (JPEG 800×800 generado en cliente por
 * `AvatarCropDialog`) y la persiste como `avatarUrl`. Devuelve la URL
 * pública para que el cliente refresque la preview sin esperar al
 * revalidate.
 */
export async function uploadAvatar(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  avatarUrl?: string;
}> {
  const me = await requireUser();
  const avatar = formData.get("avatar");
  if (!(avatar instanceof File) || avatar.size === 0) {
    return { ok: false, error: "Falta la imagen." };
  }
  // Red de seguridad: el cliente ya emite ~100-200 KB; tope generoso
  // para abusos directos contra la action.
  const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
  if (avatar.size > MAX_AVATAR_BYTES) {
    return {
      ok: false,
      error: "La imagen excede el tamaño aceptado tras recortar.",
    };
  }
  // Anti-abuso de Storage: máx. 5 subidas por minuto y usuario.
  const limited = await rateLimit(`avatar:${me.id}`, 5, 60_000);
  if (!limited.ok) {
    return { ok: false, error: "Demasiados intentos. Espera un momento." };
  }
  return runAction(
    { action: "uploadAvatar", userId: me.id },
    async () => {
      // Ruta ÚNICA por subida: si reutilizáramos `${me.id}.png`, la URL
      // pública no cambiaría y el navegador/CDN seguiría sirviendo la foto
      // anterior cacheada (de ahí que "cambiar la foto no se actualizara").
      const prevPath = avatarStoragePath(me.avatarUrl);
      const path = `${me.id}/${crypto.randomUUID()}.png`;
      const url = await uploadImage({ kind: "avatar", path, file: avatar });
      await db
        .update(profiles)
        .set({ avatarUrl: url })
        .where(eq(profiles.id, me.id));
      // Borra la imagen anterior (best-effort) para no dejar huérfanos.
      if (prevPath && prevPath !== path) {
        await deleteImage({ kind: "avatar", path: prevPath }).catch(() => {});
      }
      revalidatePath("/perfil");
      revalidatePath("/dashboard");
      revalidatePath("/ranking");
      return { ok: true, avatarUrl: url };
    },
    (error) => ({ ok: false, error }),
  );
}
