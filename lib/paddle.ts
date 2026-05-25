import { Environment, Paddle } from "@paddle/paddle-node-sdk";

/**
 * Integración con Paddle (Billing) como Merchant of Record.
 *
 * Paddle cobra al cliente, emite la factura a su nombre con el IVA
 * correspondiente (incluido VAT-MOSS europeo) y nos liquida el neto.
 * Para arrancar no hace falta darse de alta como autónomo — fiscalmente
 * cobramos como "afiliado" y declaramos el ingreso en el IRPF anual.
 *
 * Cada Pase Mundial 2026 es un price one-time en Paddle. El flujo:
 *   1. Usuario pulsa "Comprar" en /precios.
 *   2. /api/checkout/[tier] crea una transaction vía Paddle API con
 *      customData = { league_code, user_id } y devuelve la URL hosted.
 *   3. Redirigimos al usuario al checkout de Paddle.
 *   4. Pago confirmado → Paddle dispara `transaction.completed` →
 *      /api/paddle/webhook resuelve la liga del customData, aplica el
 *      upgrade de tier y notifica por Telegram.
 *
 * Sandbox vs live: el SDK enruta automáticamente según `PADDLE_ENV`.
 * Sandbox tiene products/prices distintos, así que cuando se pase a
 * live hay que recrear los products en Paddle y actualizar las 3 env
 * vars de price IDs.
 */

export type PaidTierId = "team-50" | "team-100" | "team-250";

export const PAID_TIERS: readonly PaidTierId[] = [
  "team-50",
  "team-100",
  "team-250",
];

const TIER_PRICE_ENV: Record<PaidTierId, string> = {
  "team-50": "PADDLE_PRICE_TEAM_50",
  "team-100": "PADDLE_PRICE_TEAM_100",
  "team-250": "PADDLE_PRICE_TEAM_250",
};

export const TIER_AMOUNT_EUR: Record<PaidTierId, number> = {
  "team-50": 19,
  "team-100": 49,
  "team-250": 99,
};

export function isPaidTier(value: string): value is PaidTierId {
  return (PAID_TIERS as readonly string[]).includes(value);
}

/**
 * Resuelve el priceId configurado en Paddle para un tier. Devuelve null
 * si la env var falta — el caller debe cae al fallback (lead form).
 */
export function paddlePriceIdForTier(tier: PaidTierId): string | null {
  const envKey = TIER_PRICE_ENV[tier];
  const value = process.env[envKey];
  return value && value.trim().length > 0 ? value.trim() : null;
}

/** Mapa tier → priceId, para diagnósticos / endpoints públicos. */
export function paddleConfiguredTiers(): Record<PaidTierId, boolean> {
  return {
    "team-50": paddlePriceIdForTier("team-50") != null,
    "team-100": paddlePriceIdForTier("team-100") != null,
    "team-250": paddlePriceIdForTier("team-250") != null,
  };
}

/**
 * Mapeo inverso priceId → tier, usado por el webhook al recibir el
 * `transaction.completed` para saber qué tier comprar. Hash dinámico
 * de las env vars; si el priceId del item del transaction no está
 * mapeado (porque alguien creó un product extra en Paddle), devuelve
 * null y el handler cae al flujo manual.
 */
export function tierFromPaddlePriceId(priceId: string | null | undefined): PaidTierId | null {
  if (!priceId) return null;
  for (const tier of PAID_TIERS) {
    if (paddlePriceIdForTier(tier) === priceId) return tier;
  }
  return null;
}

/**
 * Cliente Paddle compartido. Cached en module scope para reuse de la
 * conexión HTTP entre requests (Lambda warm).
 */
let cachedClient: Paddle | null = null;

export function getPaddleClient(): Paddle | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return null;
  const env =
    process.env.PADDLE_ENV === "live" ? Environment.production : Environment.sandbox;
  cachedClient = new Paddle(apiKey, { environment: env });
  return cachedClient;
}

/** Devuelve el webhook secret tal cual; el handler lo necesita para verificar. */
export function paddleWebhookSecret(): string | null {
  return process.env.PADDLE_WEBHOOK_SECRET ?? null;
}

/**
 * Token público para Paddle.js (cliente). Imprescindible en `/checkout`
 * para inicializar el SDK y abrir el overlay. Inyectado al cliente a
 * través de `NEXT_PUBLIC_*` — no es secreto, está pensado para ser
 * visible en el navegador.
 */
export function paddleClientToken(): string | null {
  return process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? null;
}

/** "sandbox" | "production" — interpretado tanto en server como cliente. */
export function paddlePublicEnv(): "sandbox" | "production" {
  // En cliente, NEXT_PUBLIC_PADDLE_ENV se inyecta en build time. En
  // server podemos usar PADDLE_ENV como fallback para que el server y
  // el cliente acaben coincidiendo en el 99% de los casos.
  const fromPublic = process.env.NEXT_PUBLIC_PADDLE_ENV;
  const fromServer = typeof window === "undefined" ? process.env.PADDLE_ENV : null;
  const raw = (fromPublic ?? fromServer ?? "sandbox").toLowerCase();
  return raw === "live" || raw === "production" ? "production" : "sandbox";
}

/** "19,00 EUR" — para mensajes de Telegram, etc. */
export function formatPaddleMoney(amountMinor: string | number, currency: string): string {
  const minor = typeof amountMinor === "string" ? Number(amountMinor) : amountMinor;
  const major = Number.isFinite(minor) ? minor / 100 : 0;
  return `${major.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
