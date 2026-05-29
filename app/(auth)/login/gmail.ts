/**
 * Bloqueo de OTP para cuentas Gmail/Google personal: usar Google OAuth es
 * instantáneo (un clic) y, además, ahorra el coste y el rate-limit de envío
 * de email. Compartido entre el server action `sendEmailOtp` (refuerzo
 * server-side) y el `LoginForm` (avisar al usuario antes de enviar).
 *
 * Dominios corporativos servidos por Google Workspace NO entran aquí —
 * detectar eso requiere un MX lookup que no merece la pena por petición.
 * Esos usuarios podrán usar OAuth si su admin lo tiene configurado, o caer
 * a OTP si no.
 */
const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function isGmailAddress(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return domain != null && GMAIL_DOMAINS.has(domain);
}

export const GMAIL_USE_GOOGLE_MESSAGE =
  "Detectamos una cuenta Gmail. Usa el botón \"Continuar con Google\" de arriba — entras en un clic, sin código.";
