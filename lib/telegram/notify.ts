/**
 * Cliente mínimo del Bot API de Telegram para enviar alertas internas.
 *
 * Configuración (`.env.local`):
 *   TELEGRAM_BOT_TOKEN     - token del bot creado en @BotFather
 *   TELEGRAM_ADMIN_CHAT_ID - chat al que se envían las alertas
 *                            (tu chat personal con el bot, o un grupo
 *                             donde tengas al bot añadido).
 *
 * Si alguna de las dos faltan, las funciones hacen no-op sin
 * lanzar — el código de producción no se rompe si todavía no has
 * cableado el bot.
 *
 * Patrón de uso: SIEMPRE `void sendTelegramMessage(...)` (fire-and-
 * forget). Nunca esperar — un fallo de Telegram no debe afectar al
 * flujo de la app.
 */

const TELEGRAM_API = "https://api.telegram.org";

type SendOptions = {
  /** Si true, el mensaje llega sin sonido / notificación push. */
  silent?: boolean;
};

export async function sendTelegramMessage(
  text: string,
  opts: SendOptions = {},
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // cache: 'no-store' para evitar que Next/Vercel cachee la petición.
      cache: "no-store",
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_notification: opts.silent ?? false,
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[telegram] sendMessage no-2xx: ${res.status} ${body.slice(0, 200)}`,
      );
    }
  } catch (err) {
    console.warn("[telegram] sendMessage failed:", err);
  }
}

/**
 * Escapa los caracteres reservados de HTML que usa Telegram en
 * `parse_mode: "HTML"`. Solo necesitamos &, <, >. El resto pasa tal cual.
 */
export function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
