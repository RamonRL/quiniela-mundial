import Link from "next/link";
import { ArrowRight, Check, Mail } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { BreadcrumbLD, ProductOffersLD } from "@/components/seo/jsonld";
import { CommercialLeadForm } from "@/components/leagues/commercial-lead-form";
import { BuyerLeagueBanner } from "./buyer-league-banner";

type PaidTierId = "team-50" | "team-100" | "team-250";

// Cacheable: la página no depende de la sesión del usuario. La
// personalización (banner "comprando para tu liga X" y `league_code`
// en el checkout) ocurre client-side vía /api/me/buyer-context y
// server-side al click vía /api/checkout/<tier>. Esto deja la HTML
// estática y rápida para Googlebot.
export const revalidate = 3600;

export const metadata = {
  title: "Planes para empresas y grupos grandes",
  description:
    "Quinielas privadas hasta 250 miembros para empresas, comunidades y eventos. Pase Mundial 2026 desde 19 € con logo corporativo, anuncios fijados y export CSV.",
  alternates: { canonical: "/precios" },
  openGraph: {
    title: "Planes · Quiniela Mundial 2026",
    description:
      "Pase Mundial 2026 para empresas y grupos grandes: hasta 50, 100 o 250 miembros. Desde 19 €.",
    url: "/precios",
  },
};

type Plan = {
  id: string;
  /** Tier id de pago. Si está presente, el CTA apunta a
   * `/api/checkout/[tier]` para iniciar el flujo de Paddle. */
  paidTierId?: PaidTierId;
  name: string;
  price: string;
  priceNote: string;
  members: string;
  highlight?: boolean;
  ctaLabel: string;
  /** Enlace interno explícito (p.ej. /onboarding para el plan Free). */
  ctaHref?: string;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "0 €",
    priceNote: "Para siempre",
    members: "Hasta 20 miembros",
    ctaLabel: "Crear gratis",
    ctaHref: "/onboarding?step=privada-crear",
  },
  {
    id: "team-50",
    paidTierId: "team-50",
    name: "Pase Equipo",
    price: "19 €",
    priceNote: "Pase Mundial 2026 · pago único",
    members: "Hasta 50 miembros",
    ctaLabel: "Comprar",
  },
  {
    id: "team-100",
    paidTierId: "team-100",
    name: "Pase Empresa",
    price: "49 €",
    priceNote: "Pase Mundial 2026 · pago único",
    members: "Hasta 100 miembros",
    highlight: true,
    ctaLabel: "Comprar",
  },
  {
    id: "team-250",
    paidTierId: "team-250",
    name: "Pase Empresa Plus",
    price: "99 €",
    priceNote: "Pase Mundial 2026 · pago único",
    members: "Hasta 250 miembros",
    ctaLabel: "Comprar",
  },
];

/** Lo mismo en todos los Pases — solo cambia el tope de miembros. */
const PAID_FEATURES: string[] = [
  "Departamentos internos con ranking por media de puntos",
  "Logo corporativo custom",
  "Anuncio fijado del organizador",
  "Export CSV del ranking",
  "Soporte prioritario por email",
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "¿Cómo funciona el pago?",
    a: "Pulsa Comprar en el plan que quieras, se abre el checkout de Paddle (tarjeta o PayPal) y al confirmar el pago recibimos aviso al instante. En cuanto verificamos que vas asociado a la quiniela correcta, levantamos el tope de miembros — normalmente al momento.",
  },
  {
    q: "¿Podéis emitir factura con los datos de mi empresa?",
    a: "Sí. El pago lo procesa Paddle como Merchant of Record: ellos emiten una factura legal con el IVA correspondiente (en España, 21 %; en otros países UE, el aplicable). Durante el checkout puedes introducir los datos fiscales de tu empresa y la factura se descarga al momento en PDF — válida para deducción contable.",
  },
  {
    q: "¿El precio es por torneo o suscripción?",
    a: "Pago único: el Pase Mundial 2026 cubre toda la edición — del 11 de junio al 19 de julio de 2026. No hay suscripción ni renovaciones automáticas.",
  },
  {
    q: "Necesitamos más de 250 miembros, ¿qué hacemos?",
    a: "Indícanos la cifra real en el mensaje del formulario y te pasamos presupuesto a medida.",
  },
  {
    q: "¿Cómo funcionan los departamentos?",
    a: "Cualquier Pase Mundial 2026 (50, 100 o 250) desbloquea departamentos internos. Tú creas sub-grupos (Marketing, Ventas, Ingeniería…) y asignas a cada miembro al suyo. Compiten por MEDIA de puntos, no totales — así un departamento pequeño puede ganar al grande. Hay un ranking aparte en /ranking → Departamentos.",
  },
  {
    q: "¿Y si quiero probarlo antes de pagar?",
    a: "Crea una quiniela gratis hasta 20 miembros para enseñársela al equipo. Cuando confirméis, comprad el Pase desde /precios y subimos el límite sin migrar datos — la misma liga, los mismos miembros, más capacidad.",
  },
  {
    q: "¿Devolución si no estamos satisfechos?",
    a: "Si el torneo aún no ha empezado y no estás contento con la herramienta, escríbenos: gestionamos la devolución con Paddle. Una vez arrancado el Mundial el reembolso ya no aplica al haberse consumido el servicio.",
  },
];

export default function PreciosPage() {
  return (
    <div className="space-y-12">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Planes", href: "/precios" },
        ]}
      />
      <ProductOffersLD
        offers={[
          {
            name: "Pase Equipo · 50 miembros",
            sku: "team-50",
            priceEur: 19,
            description:
              "Quiniela privada hasta 50 miembros con logo corporativo, anuncio fijado del organizador, export CSV del ranking y soporte prioritario por email.",
          },
          {
            name: "Pase Empresa · 100 miembros",
            sku: "team-100",
            priceEur: 49,
            description:
              "Quiniela privada hasta 100 miembros con logo corporativo, anuncio fijado del organizador, export CSV del ranking y soporte prioritario por email.",
          },
          {
            name: "Pase Empresa Plus · 250 miembros",
            sku: "team-250",
            priceEur: 99,
            description:
              "Quiniela privada hasta 250 miembros con logo corporativo, anuncio fijado del organizador, export CSV del ranking y soporte prioritario por email.",
          },
        ]}
      />

      <PageHeader
        eyebrow="Planes"
        title="Quinielas para empresas y grupos grandes"
        description="La versión Free aguanta hasta 20 miembros. Para empresas, comunidades y eventos con más gente, los Pases Mundial 2026 escalan la liga a 50, 100 o 250 personas con extras pensados para uso profesional."
      />

      <BuyerLeagueBanner />

      {/* ─── Tabla de planes ─── */}
      <section className="grid gap-5 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 transition ${
              plan.highlight
                ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] shadow-[var(--shadow-arena)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)]"
            }`}
          >
            {plan.highlight ? (
              <span className="absolute right-4 top-4 rounded-full bg-[var(--color-arena)] px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white">
                Recomendado
              </span>
            ) : null}
            <header className="space-y-1">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                {plan.name}
              </p>
              <p className="font-display text-4xl tracking-tight">{plan.price}</p>
              <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                {plan.priceNote}
              </p>
            </header>
            <div className="mt-5 flex-1 border-y border-[var(--color-border)] py-4">
              <p className="font-display text-lg tracking-tight text-[var(--color-arena)]">
                {plan.members}
              </p>
            </div>
            <div className="mt-5">
              <PlanCTA plan={plan} />
            </div>
          </article>
        ))}
      </section>

      {/* ─── Qué incluyen los Pases (mismo para todos los de pago) ─── */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-10">
        <header className="space-y-2">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Pases Mundial 2026
          </p>
          <h2 className="font-display text-3xl tracking-tight">
            Mismo paquete en los tres planes
          </h2>
          <p className="max-w-2xl font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)]">
            Los tres Pases incluyen exactamente las mismas ventajas — lo único
            que cambia entre ellos es el tope de miembros de tu quiniela.
          </p>
        </header>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {PAID_FEATURES.map((f) => (
            <li
              key={f}
              className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-arena)]" />
              <span className="text-sm leading-relaxed">{f}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ─── Enterprise ─── */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Enterprise · más de 250 miembros
            </p>
            <h2 className="font-display text-3xl tracking-tight">
              Cuéntanos qué necesitáis.
            </h2>
            <p className="max-w-xl font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)]">
              Presupuesto a medida para grupos grandes, onboarding asistido,
              branding extendido y soporte dedicado durante todo el torneo.
            </p>
          </div>
          <a
            href="#contacto"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
          >
            Contactar <ArrowRight className="size-3.5" />
          </a>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="space-y-4">
        <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Preguntas frecuentes
          </h2>
        </header>
        <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {FAQ.map((f, i) => (
            <details key={i} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="font-display text-base tracking-tight sm:text-lg">
                  {f.q}
                </span>
                <span
                  aria-hidden
                  className="font-mono text-xs text-[var(--color-arena)] transition group-open:rotate-45"
                >
                  ＋
                </span>
              </summary>
              <p className="pt-3 font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ─── Formulario de contacto ─── */}
      <section
        id="contacto"
        className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-8 sm:p-10"
      >
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div className="relative space-y-6">
          <header className="space-y-2">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
              Pídeme presupuesto
            </p>
            <h2 className="font-display text-3xl tracking-tight">
              Cuéntame de tu grupo.
            </h2>
            <p className="font-editorial text-base italic text-[var(--color-muted-foreground)]">
              Te contestamos en menos de 24 h con presupuesto y siguiente paso.
              Sin compromiso.
            </p>
          </header>
          <CommercialLeadForm />
          <p className="border-t border-[var(--color-border)] pt-4 text-center font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            o escríbeme directamente a{" "}
            <a
              href="mailto:admin@quinielamundial.es?subject=Plan%20para%20mi%20empresa"
              className="text-[var(--color-arena)]"
            >
              <Mail className="inline size-3" /> admin@quinielamundial.es
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

/**
 * Resuelve a qué destino apunta el botón "Comprar/Crear gratis" de
 * cada tier:
 *
 *  - Tier Free → enlace interno a /onboarding.
 *  - Tier de pago → `/api/checkout/<tier>`. El endpoint crea la
 *    transaction en Paddle con custom_data (league_code, user_id) y
 *    redirige al hosted checkout. Si Paddle no está configurado en
 *    runtime, el endpoint cae a /precios#contacto automáticamente.
 */
function PlanCTA({ plan }: { plan: Plan }) {
  const arenaClasses = plan.highlight
    ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
    : "border border-[var(--color-arena)]/50 text-[var(--color-arena)] hover:bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)]";

  if (plan.ctaHref) {
    return (
      <Link
        href={plan.ctaHref}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-foreground)] transition hover:border-[var(--color-arena)]/40"
      >
        {plan.ctaLabel} <ArrowRight className="size-3.5" />
      </Link>
    );
  }
  if (plan.paidTierId) {
    return (
      <a
        href={`/api/checkout/${plan.paidTierId}`}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] transition ${arenaClasses}`}
      >
        {plan.ctaLabel} <ArrowRight className="size-3.5" />
      </a>
    );
  }
  return (
    <a
      href="#contacto"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] transition ${arenaClasses}`}
    >
      Contactar <ArrowRight className="size-3.5" />
    </a>
  );
}
