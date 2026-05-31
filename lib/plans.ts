/**
 * Metadatos PUROS de los planes que se muestran al crear una quiniela (sin
 * imports de DB ni de `next/*`) para poder usarlos en componentes cliente.
 *
 * El precio que se cobra de verdad vive en `lib/paddle.ts`; aquí solo van
 * etiquetas para pintar. `regularPriceLabel` es el precio tachado (marco de
 * descuento, display-only). `key` se alinea con el tier interno de la liga
 * (`free` = "Estándar" de cara al usuario).
 */

export type PlanKey = "free" | "team-50" | "team-100" | "team-250" | "enterprise";

export const PAID_PLAN_KEYS: PlanKey[] = ["team-50", "team-100", "team-250"];

export type OnboardingPlan = {
  key: PlanKey;
  name: string;
  /** "Gratis" | "19 €" | "A medida". */
  priceLabel: string;
  /** Precio regular tachado, o null si no aplica. */
  regularPriceLabel: string | null;
  members: string;
  /** Para quién está pensado el plan (una línea). */
  audience: string;
  /** Resumen de lo que ofrece, en bullets. */
  features: string[];
  popular?: boolean;
  paid: boolean;
};

export const ONBOARDING_PLANS: OnboardingPlan[] = [
  {
    key: "free",
    name: "Estándar",
    priceLabel: "Gratis",
    regularPriceLabel: null,
    members: "Hasta 20 miembros",
    audience: "Tu grupo de amigos o familia.",
    features: [
      "Las 6 categorías de predicción",
      "Quiniela pública + hasta 5 privadas",
      "Ranking en vivo y chat de liga",
    ],
    paid: false,
  },
  {
    key: "team-50",
    name: "Pase Equipo",
    priceLabel: "19 €",
    regularPriceLabel: "29 €",
    members: "Hasta 50 miembros",
    audience: "Equipos, peñas y grupos medianos.",
    features: [
      "Todo lo de Estándar, hasta 50 personas",
      "Departamentos con ranking por media",
      "Logo corporativo y anuncio fijado",
      "Export CSV del ranking",
      "Soporte prioritario por email",
    ],
    popular: true,
    paid: true,
  },
  {
    key: "team-100",
    name: "Pase Empresa",
    priceLabel: "49 €",
    regularPriceLabel: "69 €",
    members: "Hasta 100 miembros",
    audience: "Empresas medianas y comunidades.",
    features: [
      "Todo lo del Pase Equipo, hasta 100 personas",
      "Departamentos internos sin límite",
      "Logo corporativo y anuncio fijado",
      "Export CSV del ranking",
      "Soporte prioritario por email",
    ],
    paid: true,
  },
  {
    key: "team-250",
    name: "Pase Empresa Plus",
    priceLabel: "99 €",
    regularPriceLabel: "149 €",
    members: "Hasta 250 miembros",
    audience: "Grandes organizaciones y eventos.",
    features: [
      "Todo lo del Pase Empresa, hasta 250 personas",
      "Departamentos internos sin límite",
      "Logo corporativo y anuncio fijado",
      "Export CSV del ranking",
      "Soporte prioritario por email",
    ],
    paid: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    priceLabel: "A medida",
    regularPriceLabel: null,
    members: "Sin tope de miembros",
    audience: "Más de 250 o necesidades especiales.",
    features: [
      "Todo lo de los Pases, sin tope de miembros",
      "Onboarding y soporte dedicado",
      "Facturación y condiciones a medida",
    ],
    paid: false,
  },
];
