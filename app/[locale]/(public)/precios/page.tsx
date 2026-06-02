import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
  /** Precio "regular" tachado (marco de descuento, display-only). */
  regularPrice?: string;
  priceNote: string;
  members: string;
  highlight?: boolean;
  ctaLabel: string;
  /** Enlace interno explícito (p.ej. /onboarding para el plan Free). */
  ctaHref?: string;
};

export default async function PreciosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const tNav = await getTranslations("nav");

  const PLANS: Plan[] = [
    {
      id: "free",
      name: t("freeName"),
      price: t("freePrice"),
      priceNote: t("freeNote"),
      members: t("freeMembers"),
      ctaLabel: t("freeCta"),
      ctaHref: "/onboarding?step=privada-crear",
    },
    {
      id: "team-50",
      paidTierId: "team-50",
      name: t("t50Name"),
      price: "19 €",
      regularPrice: "29 €",
      priceNote: t("paidNote"),
      members: t("t50Members"),
      highlight: true,
      ctaLabel: t("buy"),
    },
    {
      id: "team-100",
      paidTierId: "team-100",
      name: t("t100Name"),
      price: "49 €",
      regularPrice: "69 €",
      priceNote: t("paidNote"),
      members: t("t100Members"),
      ctaLabel: t("buy"),
    },
    {
      id: "team-250",
      paidTierId: "team-250",
      name: t("t250Name"),
      price: "99 €",
      regularPrice: "149 €",
      priceNote: t("paidNote"),
      members: t("t250Members"),
      ctaLabel: t("buy"),
    },
  ];

  // Lo mismo en todos los Pases — solo cambia el tope de miembros.
  const PAID_FEATURES: string[] = [
    t("feat1"),
    t("feat2"),
    t("feat3"),
    t("feat4"),
    t("feat5"),
  ];

  const FAQ = Array.from({ length: 7 }, (_, i) => ({
    q: t(`faq.q${i + 1}`),
    a: t(`faq.a${i + 1}`),
  }));

  return (
    <div className="space-y-12">
      <BreadcrumbLD
        items={[
          { name: tNav("inicio"), href: "/" },
          { name: t("headerEyebrow"), href: "/precios" },
        ]}
      />
      <ProductOffersLD
        offers={[
          {
            name: t("offer50Name"),
            sku: "team-50",
            priceEur: 19,
            description: t("offer50Desc"),
          },
          {
            name: t("offer100Name"),
            sku: "team-100",
            priceEur: 49,
            description: t("offer100Desc"),
          },
          {
            name: t("offer250Name"),
            sku: "team-250",
            priceEur: 99,
            description: t("offer250Desc"),
          },
        ]}
      />

      <PageHeader
        eyebrow={t("headerEyebrow")}
        title={t("headerTitle")}
        description={t("headerDesc")}
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
                {t("mostPopular")}
              </span>
            ) : null}
            <header className="space-y-1">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                {plan.name}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="font-display text-4xl tracking-tight">{plan.price}</p>
                {plan.regularPrice ? (
                  <span className="font-display text-xl tracking-tight text-[var(--color-muted-foreground)] line-through decoration-[var(--color-arena)]/70">
                    {plan.regularPrice}
                  </span>
                ) : null}
              </div>
              <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                {plan.regularPrice ? t("launchOffer") : ""}
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
            {t("featuresEyebrow")}
          </p>
          <h2 className="font-display text-3xl tracking-tight">
            {t("featuresTitle")}
          </h2>
          <p className="max-w-2xl font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)]">
            {t("featuresDesc")}
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
              {t("entEyebrow")}
            </p>
            <h2 className="font-display text-3xl tracking-tight">
              {t("entTitle")}
            </h2>
            <p className="max-w-xl font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)]">
              {t("entDesc")}
            </p>
          </div>
          <a
            href="#contacto"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
          >
            {t("contact")} <ArrowRight className="size-3.5" />
          </a>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="space-y-4">
        <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("faqEyebrow")}
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
              {t("contactEyebrow")}
            </p>
            <h2 className="font-display text-3xl tracking-tight">
              {t("contactTitle")}
            </h2>
            <p className="font-editorial text-base italic text-[var(--color-muted-foreground)]">
              {t("contactDesc")}
            </p>
          </header>
          <CommercialLeadForm />
          <p className="border-t border-[var(--color-border)] pt-4 text-center font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("orEmail")}{" "}
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
 *  - Tier de pago → `/precios/comprar/<tier>`, el gateway que exige
 *    sesión + liga elegible explícita antes de crear la transaction en
 *    Paddle. Cierra el agujero por el que entró Salvador (pagar sin
 *    cuenta) y evita las pasadas sin `league_code` en `customData`.
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
      <Link
        href={`/precios/comprar/${plan.paidTierId}`}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] transition ${arenaClasses}`}
      >
        {plan.ctaLabel} <ArrowRight className="size-3.5" />
      </Link>
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
