import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/guards";
import { PENDING_INVITE_COOKIE, joinLeagueByInviteToken } from "@/lib/leagues";

/**
 * Resuelve a dónde mandar al usuario nada más cerrar sesión con éxito
 * (OAuth Google, OTP por email, o cualquier futuro provider).
 *
 * Llamar SIEMPRE después de que el client/server de Supabase haya seteado
 * los cookies de sesión (p. ej. tras `exchangeCodeForSession` o `verifyOtp`).
 *
 * Lógica unificada:
 *  - `getCurrentUser()` crea el `profiles` row si es primer login; si el
 *    usuario ya existía, solo lo carga. Para nuevos usuarios consume él
 *    mismo la cookie de invite (vía `resolveInviteLeague` interno).
 *  - Para usuarios EXISTENTES con invite cookie pendiente, aquí la
 *    consumimos explícitamente y los añadimos a la liga. Si chocan con el
 *    límite de privadas, redirigimos al dashboard con un mensaje.
 *  - Si por cualquier motivo el usuario no tiene aún liga o apodo, va al
 *    onboarding antes que al destino.
 */
export async function resolvePostSignInRedirect(next: string): Promise<string> {
  const me = await getCurrentUser();
  if (!me) return next;

  const cookieStore = await cookies();
  const pending = cookieStore.get(PENDING_INVITE_COOKIE)?.value;
  if (pending) {
    const result = await joinLeagueByInviteToken(me.id, pending);
    cookieStore.delete(PENDING_INVITE_COOKIE);
    if (
      !result.ok &&
      result.reason === "private_limit_reached" &&
      result.leagueName
    ) {
      return `/dashboard?invite_error=${encodeURIComponent(
        `Ya tienes 5 quinielas privadas. Para unirte a "${result.leagueName}" abandona alguna desde tu perfil.`,
      )}`;
    }
    if (me.nickname == null) return "/onboarding";
    return next;
  }

  // Cuenta nueva sin invite, o cuenta existente que aún no terminó onboarding.
  if (me.leagueId == null || me.nickname == null) return "/onboarding";
  return next;
}
