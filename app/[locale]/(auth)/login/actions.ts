"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePostSignInRedirect } from "@/lib/auth/post-signin";
import { rateLimit } from "@/lib/ratelimit";
import { GMAIL_USE_GOOGLE_MESSAGE, isGmailAddress } from "./gmail";

async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/**
 * Kicks off Google OAuth via Supabase. Returns the provider URL and redirects
 * the browser to it. Supabase will redirect back to /auth/callback after the
 * user approves on Google's side.
 */
export async function signInWithGoogle(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const origin = await getOrigin();
  const next = formData.get("next")?.toString() ?? "/dashboard";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/auth/error?reason=${encodeURIComponent(error?.message ?? "oauth_failed")}`);
  }
  redirect(data.url);
}

// ───────────────────────── OTP por email ─────────────────────────
//
// Alternativa a Google OAuth pensada para dominios corporativos que NO usan
// Google Workspace (cuentas de empresa con servidor de correo propio o
// Microsoft 365). Supabase envía un código de 6 dígitos al email indicado;
// el usuario lo introduce y se le crea la sesión. Mismo destino post-auth
// que Google (resolvePostSignInRedirect), así que onboarding e invites
// funcionan igual.

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email inválido.");

const tokenSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "El código son 6 dígitos.");

export type OtpSendState = {
  ok: boolean;
  error?: string;
  /** El email validado, para pre-cargarlo en el siguiente paso del form. */
  email?: string;
};

/**
 * Paso 1: pide a Supabase que envíe el OTP al email. Devuelve `ok: true` y el
 * email validado (lo usa el cliente para guardarlo y pasárselo al paso 2).
 *
 * NO revelamos si el email existe o no — un atacante no debería poder usar
 * esto para enumerar usuarios. Por eso devolvemos siempre `ok: true` salvo
 * que la validación del propio formato falle, o nos bloquee Supabase (rate
 * limit interno) — el mensaje es genérico.
 */
export async function sendEmailOtp(
  _prev: OtpSendState,
  formData: FormData,
): Promise<OtpSendState> {
  const parsed = emailSchema.safeParse(formData.get("email") ?? "");
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Email inválido." };
  }
  const email = parsed.data;

  // Para cuentas Gmail mandamos al usuario al botón de Google: entra en un
  // clic, sin código. Es además un ahorro nuestro de SMTP y rate-limit. El
  // bloqueo está también en el cliente (UX), aquí es la red de seguridad.
  if (isGmailAddress(email)) {
    return { ok: false, error: GMAIL_USE_GOOGLE_MESSAGE };
  }

  // Anti-abuso: máx. 5 envíos por hora desde la misma IP+email para no
  // habilitar mandar miles de OTPs a un buzón. Supabase también tiene su
  // propio throttle, esto es defensa en profundidad.
  const limited = await rateLimit(`otp-send:${email}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return {
      ok: false,
      error: "Demasiados intentos. Espera un rato antes de pedir otro código.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    // Sin filtrar detalles internos al cliente.
    return {
      ok: false,
      error: "No pudimos enviar el código. Reintenta en unos minutos.",
    };
  }
  return { ok: true, email };
}

export type OtpVerifyState = {
  ok: boolean;
  error?: string;
};

/**
 * Paso 2: valida el código contra Supabase. Si encaja, la sesión queda
 * establecida en cookies; redirigimos al destino que decida el helper
 * compartido (onboarding, invite, o `next`).
 */
export async function verifyEmailOtp(
  _prev: OtpVerifyState,
  formData: FormData,
): Promise<OtpVerifyState> {
  const emailParsed = emailSchema.safeParse(formData.get("email") ?? "");
  const tokenParsed = tokenSchema.safeParse(formData.get("token") ?? "");
  if (!emailParsed.success || !tokenParsed.success) {
    return {
      ok: false,
      error:
        emailParsed.success
          ? tokenParsed.error?.issues[0]?.message ?? "Código inválido."
          : "Email inválido.",
    };
  }
  const email = emailParsed.data;
  const token = tokenParsed.data;
  const next = formData.get("next")?.toString() ?? "/dashboard";

  // Anti-fuerza-bruta: máx. 10 intentos de verificación por email cada
  // 15 min. Supabase invalida el OTP tras varios fallos, esto frena pruebas
  // antes incluso de llegar.
  const limited = await rateLimit(`otp-verify:${email}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return {
      ok: false,
      error: "Demasiados intentos. Pide un código nuevo en unos minutos.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) {
    return { ok: false, error: "Código incorrecto o caducado." };
  }

  // Sesión ya establecida → mismo post-auth que OAuth (perfil + invite + redirect).
  const redirectTo = await resolvePostSignInRedirect(next);
  redirect(redirectTo);
}
