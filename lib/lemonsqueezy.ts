import crypto from "node:crypto";

/**
 * Integración con Lemon Squeezy como Merchant of Record.
 *
 * Lemon Squeezy cobra al cliente, emite la factura a su nombre con el
 * IVA correspondiente (incluido VAT-MOSS europeo), y nos liquida el
 * neto cada mes. Para arrancar no hace falta darse de alta como
 * autónomo — fiscalmente cobramos como "afiliado" y declaramos el
 * ingreso en el IRPF anual.
 *
 * Cada Pase Mundial 2026 es un producto en LS con su propia URL de
 * hosted checkout. La URL se guarda en una env var y el botón
 * "Comprar" de /precios redirige a ella. Tras el pago, LS dispara
 * un webhook a `/api/lemon-squeezy/webhook` que registra el lead
 * con status "won" y notifica por Telegram para que activemos el
 * Pase manualmente desde /admin/ligas/[id].
 */

export type PaidTierId = "team-50" | "team-100" | "team-250";

/**
 * Mapa tier → URL del hosted checkout de Lemon Squeezy. Si una env
 * var falta, el botón de ese tier cae al fallback "Contactar" del
 * formulario comercial — así no se rompe nada antes de configurar LS.
 *
 * Si se pasa `leagueCode`, se anexa como `custom_data` al checkout para
 * que el webhook pueda resolver automáticamente a qué liga aplicar el
 * Pase tras el pago. LS expone los `custom_data` vía la sintaxis
 * `?checkout[custom][KEY]=VALUE` en la URL.
 */
export function getCheckoutUrls(
  leagueCode?: string | null,
): Record<PaidTierId, string | null> {
  const raw = {
    "team-50": process.env.LEMONSQUEEZY_CHECKOUT_TEAM_50 ?? null,
    "team-100": process.env.LEMONSQUEEZY_CHECKOUT_TEAM_100 ?? null,
    "team-250": process.env.LEMONSQUEEZY_CHECKOUT_TEAM_250 ?? null,
  };
  if (!leagueCode) return raw;
  return Object.fromEntries(
    Object.entries(raw).map(([tier, url]) => [
      tier,
      url ? appendLeagueCode(url, leagueCode) : null,
    ]),
  ) as Record<PaidTierId, string | null>;
}

function appendLeagueCode(checkoutUrl: string, leagueCode: string): string {
  const sep = checkoutUrl.includes("?") ? "&" : "?";
  return `${checkoutUrl}${sep}checkout[custom][league_code]=${encodeURIComponent(
    leagueCode,
  )}`;
}

/**
 * Verifica la firma HMAC-SHA256 que LS envía en el header
 * `X-Signature` de cada webhook. Usa `timingSafeEqual` para evitar
 * timing attacks. Devuelve false si no hay secret configurado —
 * el caller debe rechazar la petición en ese caso.
 */
export function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Forma mínima del payload `order_created` que necesitamos. LS manda
 * mucho más (subscriptions, customer, store, etc.) — solo extraemos
 * lo imprescindible para crear el lead.
 */
export type LemonSqueezyOrderEvent = {
  meta: {
    event_name: string;
    custom_data?: Record<string, string> | null;
  };
  data: {
    id: string;
    attributes: {
      user_name: string;
      user_email: string;
      currency: string;
      total: number; // en céntimos
      status: string;
      order_number: number;
      first_order_item: {
        product_id: number;
        variant_id: number;
        product_name: string;
        variant_name: string;
        price: number;
      };
    };
  };
};

/**
 * Mapea el precio (en céntimos, sin IVA) del primer order item al tier
 * correspondiente. Usamos el `price` del order item porque es siempre
 * el subtotal del variant — el `total` del pedido lleva IVA si aplica.
 *
 * Si una variante con precio distinto a los 3 oficiales llega aquí
 * (porque alguien crea otro producto en LS por error o usa códigos de
 * descuento), devuelve null y el webhook cae al flujo manual.
 */
export function tierFromOrderItemPrice(priceCents: number): PaidTierId | null {
  switch (priceCents) {
    case 2900:
      return "team-50";
    case 6900:
      return "team-100";
    case 14900:
      return "team-250";
    default:
      return null;
  }
}

/** Formatea céntimos a "29,00 €" para el mensaje de Telegram. */
export function formatLemonAmount(cents: number, currency: string): string {
  const eur = cents / 100;
  return `${eur.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
