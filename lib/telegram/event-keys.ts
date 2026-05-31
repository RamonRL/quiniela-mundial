/**
 * Metadatos PUROS de los eventos notificables a Telegram (sin imports de DB
 * ni de `next/*`) para que se puedan importar desde componentes cliente —
 * p. ej. el editor de /admin/notificaciones — sin arrastrar el cliente de
 * postgres al bundle del navegador. La capa con efectos (lectura/escritura
 * de `app_settings`) vive en `lib/telegram/settings.ts`.
 */

export type TelegramEventKey =
  | "user.new"
  | "league.new"
  | "match.result"
  | "chat.message"
  | "lead.new"
  | "paddle.order"
  | "server.error";

export const TELEGRAM_EVENTS: {
  key: TelegramEventKey;
  label: string;
  description: string;
}[] = [
  {
    key: "user.new",
    label: "Usuario nuevo",
    description: "Cada vez que alguien se registra por primera vez.",
  },
  {
    key: "league.new",
    label: "Quiniela privada nueva",
    description: "Cuando se crea una quiniela privada (con su modo y plan).",
  },
  {
    key: "match.result",
    label: "Resultado introducido",
    description: "Cuando metes el resultado de un partido en admin.",
  },
  {
    key: "chat.message",
    label: "Mensaje de chat",
    description: "Cada mensaje nuevo en cualquier chat (llega silencioso).",
  },
  {
    key: "lead.new",
    label: "Lead comercial",
    description: "Cuando alguien rellena el formulario de contacto/precios.",
  },
  {
    key: "paddle.order",
    label: "Pago de Paddle",
    description: "Pagos recibidos y pases activados automáticamente.",
  },
  {
    key: "server.error",
    label: "Error 500 del servidor",
    description: "Alertas de errores internos. Recomendado dejarlo activo.",
  },
];
