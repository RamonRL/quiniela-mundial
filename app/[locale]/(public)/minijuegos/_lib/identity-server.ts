import "server-only";
import { getCurrentUser } from "@/lib/auth/guards";
import { NICKNAME_MAX_LEN, NICKNAME_MIN_LEN, NICKNAME_REGEX } from "./identity";

export type ResolvedIdentity = {
  kind: "user" | "guest";
  identityKey: string;
  displayName: string;
  userId: string | null;
  guestNickname: string | null;
};

/**
 * Resuelve la identidad del jugador para guardar score:
 * - Si hay sesión → usa userId (estable). Display: nickname o email pre-@.
 * - Si NO hay sesión → exige apodo válido del cliente. identityKey
 *   `guest:${nicknameNormalizado}` para que el unique compuesto agrupe la
 *   mejor puntuación por apodo.
 *
 * Lanza Error si el invitado no manda apodo o si el formato es inválido.
 */
export async function resolveIdentity(rawNickname?: string | null): Promise<ResolvedIdentity> {
  const me = await getCurrentUser();
  if (me) {
    const display = me.nickname?.trim() || me.email.split("@")[0];
    return {
      kind: "user",
      identityKey: me.id,
      displayName: display,
      userId: me.id,
      guestNickname: null,
    };
  }
  if (!rawNickname) throw new Error("Necesitas un apodo para jugar como invitado.");
  const cleaned = rawNickname.trim().replace(/\s+/g, " ");
  if (!NICKNAME_REGEX.test(cleaned)) {
    throw new Error(
      `Apodo inválido. Usa ${NICKNAME_MIN_LEN}-${NICKNAME_MAX_LEN} caracteres (letras, números, espacios, _ o -).`,
    );
  }
  return {
    kind: "guest",
    identityKey: `guest:${cleaned.toLowerCase()}`,
    displayName: cleaned,
    userId: null,
    guestNickname: cleaned,
  };
}
