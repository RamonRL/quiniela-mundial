/**
 * Datos de pago manual mostrados en `/precios/pagar/[tier]` mientras no
 * tengamos pasarela MoR activa. Los IBAN y números de Bizum son
 * técnicamente públicos (van en cualquier factura emitida), así que se
 * pueden mantener en código sin comprometer seguridad.
 *
 * Si en algún momento se activa Paddle / LS, esta página puede
 * convivir con la pasarela como alternativa "pago manual" o desaparecer
 * por completo cambiando el destino del CTA en `/precios`.
 */

export const PAYMENT_METHODS = {
  bizum: {
    phone: "+34 697 56 77 61",
    holder: "Ramón Romero",
  },
  bank: {
    iban: "ES67 1544 7889 7366 5360 2822",
    holder: "Ramón Romero León",
    bic: null as string | null,
  },
  paypal: {
    email: "ramonromerosamc@gmail.com",
  },
  receiptEmail: "admin@quinielamundial.es",
} as const;

/**
 * Construye el "concepto" que el usuario debe poner en la transferencia /
 * Bizum / nota de PayPal. Diseñado para que el admin pueda casarlo con
 * el `pendingPayment` correspondiente con un grep.
 *
 * Formato: `QM26-<TIER>-<LEAGUE>` (ej. `QM26-TEAM100-A1B2`)
 */
export function paymentConcept(tier: string, leagueCode: string | null): string {
  const tierCode = tier.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const league = (leagueCode ?? "PEND").replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `QM26-${tierCode}-${league}`;
}
