/**
 * Helper de setup del bot de Telegram.
 *
 * Pasos:
 *   1. Crea el bot con @BotFather en Telegram y guarda el token en
 *      TELEGRAM_BOT_TOKEN (.env.local).
 *   2. Manda CUALQUIER mensaje al bot desde tu cuenta personal (basta
 *      "hola"). Si quieres que las alertas vayan a un grupo, primero
 *      añade el bot al grupo y manda ahí el mensaje.
 *   3. Corre `pnpm db:telegram-chat-id` (este script).
 *   4. Copia el `chat_id` que imprime y guárdalo en
 *      TELEGRAM_ADMIN_CHAT_ID (.env.local).
 *   5. Reinicia el dev server.
 *
 * Limitación de la API: getUpdates solo devuelve los últimos ~24 horas
 * de mensajes que el bot ha recibido. Si llevas días sin escribirle,
 * vuelve a mandarle un mensaje antes de correr el script.
 */

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("✘ TELEGRAM_BOT_TOKEN no está definido en .env.local");
    console.error("  Crea el bot con @BotFather y guarda el token primero.");
    process.exit(1);
  }

  const url = `https://api.telegram.org/bot${token}/getUpdates`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`✘ Telegram getUpdates devolvió ${res.status}`);
    console.error("  Verifica que el TELEGRAM_BOT_TOKEN es correcto.");
    process.exit(1);
  }

  const data = (await res.json()) as {
    ok: boolean;
    result: Array<{
      message?: {
        chat: { id: number; type: string; title?: string; username?: string; first_name?: string };
        text?: string;
        date: number;
      };
    }>;
  };

  if (!data.ok || !Array.isArray(data.result)) {
    console.error("✘ Respuesta inesperada de Telegram:", data);
    process.exit(1);
  }

  if (data.result.length === 0) {
    console.error("⚠ Sin mensajes recientes. Manda cualquier mensaje al bot");
    console.error("  desde tu cuenta (o añádelo a un grupo y escribe allí)");
    console.error("  y vuelve a correr este script.");
    process.exit(1);
  }

  const seen = new Set<number>();
  console.log("Chats encontrados:\n");
  for (const upd of data.result) {
    const msg = upd.message;
    if (!msg) continue;
    if (seen.has(msg.chat.id)) continue;
    seen.add(msg.chat.id);
    const label =
      msg.chat.type === "private"
        ? `${msg.chat.first_name ?? ""} (@${msg.chat.username ?? "—"})`
        : `${msg.chat.title ?? "grupo"} [${msg.chat.type}]`;
    console.log(`  chat_id=${msg.chat.id}  ${label}`);
  }
  console.log("\nCopia el chat_id que quieras usar para alertas y guárdalo en");
  console.log("  TELEGRAM_ADMIN_CHAT_ID=<chat_id>");
  console.log("en tu .env.local. Después reinicia el dev server.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
