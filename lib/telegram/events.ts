/**
 * Helpers tipados por tipo de evento. Cada función construye un
 * mensaje HTML para Telegram y lo despacha con `sendTelegramMessage`.
 *
 * Convenciones:
 * - Emoji al inicio de cada bloque de título para que el mensaje
 *   sea escaneable de un vistazo en la lista de chats.
 * - `<a href>` al final con un deeplink al panel admin relevante,
 *   así el bot funciona como dashboard ligero.
 * - Cuerpo en HTML mínimo (b, i, code, pre, a). Evita formatos
 *   exóticos — la app de Telegram solo soporta esos.
 * - Todos los datos de entrada pasan por `escapeHTML` antes de
 *   interpolarse para evitar inyección de tags.
 */

import { escapeHTML, sendTelegramMessage } from "./notify";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://quinielamundial.es";

export async function notifyNewUser(args: {
  email: string;
  countryCode: string | null;
  role: "user" | "admin";
}): Promise<void> {
  const country = args.countryCode ? ` · 🌍 ${escapeHTML(args.countryCode)}` : "";
  const adminTag = args.role === "admin" ? " · 🛡 <b>ADMIN</b>" : "";
  const text = [
    "🎉 <b>Nuevo usuario registrado</b>",
    `📧 <code>${escapeHTML(args.email)}</code>${country}${adminTag}`,
    `<a href="${SITE_URL}/admin/usuarios">Ver en admin</a>`,
  ].join("\n");
  await sendTelegramMessage(text);
}

export async function notifyNewPrivateLeague(args: {
  id: number;
  name: string;
  joinCode: string | null;
  creatorEmail: string;
}): Promise<void> {
  const code = args.joinCode ? ` · 🔢 <code>${escapeHTML(args.joinCode)}</code>` : "";
  const text = [
    "🏆 <b>Nueva quiniela privada</b>",
    `🏷 <b>${escapeHTML(args.name)}</b>${code}`,
    `👤 <code>${escapeHTML(args.creatorEmail)}</code>`,
    `<a href="${SITE_URL}/admin/ligas/${args.id}">Ver en admin</a>`,
  ].join("\n");
  await sendTelegramMessage(text);
}

export async function notifyMatchResult(args: {
  matchId: number;
  code: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  stage: string;
  wentToPens: boolean;
  homeScorePen: number | null;
  awayScorePen: number | null;
}): Promise<void> {
  const pens =
    args.wentToPens && args.homeScorePen != null && args.awayScorePen != null
      ? ` <i>(pen ${args.homeScorePen}-${args.awayScorePen})</i>`
      : args.wentToPens
        ? " <i>(penaltis)</i>"
        : "";
  const text = [
    "⚽ <b>Resultado introducido</b>",
    `<b>${escapeHTML(args.home)}</b> ${args.homeScore} – ${args.awayScore} <b>${escapeHTML(args.away)}</b>${pens}`,
    `🎯 <code>${escapeHTML(args.stage.toUpperCase())}</code> · ${escapeHTML(args.code)}`,
    `<a href="${SITE_URL}/partido/${args.matchId}">Ver partido</a>`,
  ].join("\n");
  await sendTelegramMessage(text);
}

export async function notifyNewChatMessage(args: {
  leagueName: string;
  isPublic: boolean;
  authorEmail: string;
  authorNickname: string | null;
  body: string;
}): Promise<void> {
  const author = args.authorNickname ?? args.authorEmail;
  const preview =
    args.body.length > 240 ? `${args.body.slice(0, 240)}…` : args.body;
  const tag = args.isPublic ? "🌐 pública" : "🔒 privada";
  const text = [
    "💬 <b>Nuevo mensaje en chat</b>",
    `🏆 ${escapeHTML(args.leagueName)} · ${tag}`,
    `👤 <b>${escapeHTML(author)}</b>`,
    "",
    `<i>${escapeHTML(preview)}</i>`,
    "",
    `<a href="${SITE_URL}/admin/chat">Moderar</a>`,
  ].join("\n");
  // El chat puede ser frecuente — los mensajes llegan silent (sin
  // notificación push) para no spam.
  await sendTelegramMessage(text, { silent: true });
}

export async function notifyNewCommercialLead(args: {
  id: number;
  name: string;
  email: string;
  company: string | null;
  expectedMembers: number | null;
  message: string | null;
}): Promise<void> {
  const company = args.company ? ` · 🏢 ${escapeHTML(args.company)}` : "";
  const members =
    args.expectedMembers != null ? ` · 👥 ${args.expectedMembers}` : "";
  const message = args.message
    ? `\n\n<i>${escapeHTML(args.message.slice(0, 600))}</i>`
    : "";
  const text = [
    "💼 <b>Lead comercial</b>",
    `👤 <b>${escapeHTML(args.name)}</b>${company}${members}`,
    `📧 <code>${escapeHTML(args.email)}</code>`,
    message,
    `<a href="${SITE_URL}/admin/leads">Ver en admin</a>`,
  ].join("\n");
  await sendTelegramMessage(text);
}

export async function notifyLemonSqueezyOrder(args: {
  orderId: string;
  orderNumber: number;
  productName: string;
  amountFormatted: string;
  customerName: string;
  customerEmail: string;
  /** Si el webhook resolvió la liga y la subió de tier solo, este
   * resumen aparece en el aviso para que sepas que NO tienes que tocar
   * nada. */
  autoActivation?: {
    leagueId: number;
    leagueName: string;
    resolvedBy: "league_code" | "email";
  };
}): Promise<void> {
  const headline = args.autoActivation
    ? "✅ <b>Pase activado automáticamente · Lemon Squeezy</b>"
    : "💸 <b>Pago recibido · Lemon Squeezy</b>";

  const lines = [
    headline,
    `🎟 <b>${escapeHTML(args.productName)}</b> · ${escapeHTML(args.amountFormatted)}`,
    `👤 ${escapeHTML(args.customerName)}`,
    `📧 <code>${escapeHTML(args.customerEmail)}</code>`,
  ];

  if (args.autoActivation) {
    const via = args.autoActivation.resolvedBy === "league_code"
      ? "código en checkout"
      : "email del comprador";
    lines.push(
      `🏆 <b>${escapeHTML(args.autoActivation.leagueName)}</b> (${via})`,
      `<a href="${SITE_URL}/admin/ligas/${args.autoActivation.leagueId}">Ver liga</a>`,
    );
  } else {
    lines.push(
      "⚠️ <i>No se pudo asociar a una liga automáticamente — activar a mano.</i>",
      `<a href="${SITE_URL}/admin/leads">Ver en admin</a>`,
    );
  }

  lines.push(`#${args.orderNumber}`);
  await sendTelegramMessage(lines.join("\n"));
}

export async function notifyServerError(args: {
  message: string;
  route?: string | null;
  userId?: string | null;
}): Promise<void> {
  const route = args.route ? `📍 <code>${escapeHTML(args.route)}</code>\n` : "";
  const user = args.userId ? `👤 <code>${escapeHTML(args.userId)}</code>\n` : "";
  // Limitamos el cuerpo a 800 chars — Telegram corta a 4096 y queremos
  // dejar margen al stack si añadimos en el futuro.
  const message = args.message.length > 800
    ? `${args.message.slice(0, 800)}…`
    : args.message;
  const text = [
    "🚨 <b>Error 500</b>",
    `${route}${user}`,
    `<pre>${escapeHTML(message)}</pre>`,
  ].join("\n");
  await sendTelegramMessage(text);
}
