import Link from "next/link";
import { type StaticImageData } from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowRight,
  Building2,
  Check,
  Layers,
  Mail,
  Megaphone,
  Paintbrush,
  X,
} from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { Counter } from "@/components/animation/counter";
import { BreadcrumbLD, ProductOffersLD } from "@/components/seo/jsonld";
import { CommercialLeadForm } from "@/components/leagues/commercial-lead-form";
import { BuyerLeagueBanner } from "./buyer-league-banner";
import { ShowcaseShot } from "./showcase-shot";

// Capturas reales del producto (liga demo "Synaptech World Cup"),
// localizadas por idioma. Static imports → next/image las optimiza y
// genera el placeholder blur.
import brandingES from "@/marketing/BRANDING/ES.png";
import brandingEN from "@/marketing/BRANDING/EN.png";
import brandingFR from "@/marketing/BRANDING/FR.png";
import brandingPT from "@/marketing/BRANDING/PT.png";
import deptsES from "@/marketing/DEPARTAMENTOS/ES.png";
import deptsEN from "@/marketing/DEPARTAMENTOS/EN.png";
import deptsFR from "@/marketing/DEPARTAMENTOS/FR.png";
import deptsPT from "@/marketing/DEPARTAMENTOS/PT.png";
import bannerES from "@/marketing/BANNER/ES.png";
import bannerEN from "@/marketing/BANNER/EN.png";
import bannerFR from "@/marketing/BANNER/FR.png";
import bannerPT from "@/marketing/BANNER/PT.png";

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
    "Quinielas privadas hasta 250 miembros para empresas, comunidades y eventos. Pase Mundial 2026 desde 19 € con logo corporativo, departamentos y anuncios fijados.",
  alternates: { canonical: "/precios" },
  openGraph: {
    title: "Planes · Quiniela Mundial 2026",
    description:
      "Pase Mundial 2026 para empresas y grupos grandes: hasta 50, 100 o 250 miembros. Desde 19 €.",
    url: "/precios",
  },
};

const SHOTS: Record<string, Record<"branding" | "depts" | "banner", StaticImageData>> = {
  es: { branding: brandingES, depts: deptsES, banner: bannerES },
  en: { branding: brandingEN, depts: deptsEN, banner: bannerEN },
  fr: { branding: brandingFR, depts: deptsFR, banner: bannerFR },
  pt: { branding: brandingPT, depts: deptsPT, banner: bannerPT },
};

type Plan = {
  id: string;
  /** Tier id de pago. Si está presente, el CTA apunta a
   * `/precios/comprar/[tier]` (gateway con sesión + liga elegible). */
  paidTierId?: PaidTierId;
  name: string;
  price: string;
  /** Precio "regular" tachado (marco de descuento, display-only). */
  regularPrice?: string;
  priceNote: string;
  members: string;
  perPerson?: string;
  /** "Todo lo del plan anterior, y además:" */
  inherits?: string;
  features: string[];
  /** Features NO incluidas — se pintan tachadas (upsell honesto). */
  missing?: string[];
  highlight?: boolean;
  ctaLabel: string;
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
  const tHome = await getTranslations("home");
  const shots = SHOTS[locale] ?? SHOTS.es;

  const PLANS: Plan[] = [
    {
      id: "free",
      name: t("freeName"),
      price: t("freePrice"),
      priceNote: t("freeNote"),
      members: t("freeMembers"),
      features: [t("freeF1"), t("freeF2"), t("freeF3")],
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
      perPerson: tHome("empresas.tier1PerPerson"),
      inherits: t("allOfFree"),
      features: [t("p50F1"), t("p50F2"), t("p50F3"), t("p50F4")],
      missing: [t("p50NoBrand")],
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
      perPerson: tHome("empresas.tier2PerPerson"),
      inherits: t("allOf50"),
      features: [t("p100F1"), t("p100F2"), t("p100F3")],
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
      perPerson: tHome("empresas.tier3PerPerson"),
      inherits: t("allOf100"),
      features: [t("p250F1"), t("p250F2"), t("p250F3")],
      ctaLabel: t("buy"),
    },
  ];

  const FAQ = Array.from({ length: 7 }, (_, i) => ({
    q: t(`faq.q${i + 1}`),
    a: t(`faq.a${i + 1}`),
  }));

  const TICKER = [t("ticker1"), t("ticker2"), t("ticker3"), t("ticker4"), t("ticker5")];

  return (
    <div className="space-y-20">
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

      {/* ───────── HERO B2B ─────────
          Full-bleed, mismo lenguaje que la home: halftone + glow radial,
          eyebrow con reglas, display gigante y stats con Counter. */}
      <section className="relative -mx-4 -mt-6 overflow-hidden border-b border-[var(--color-border)] px-4 pb-0 pt-14 sm:pt-20 lg:-mx-8 lg:px-8">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--color-arena) 30%, transparent), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--color-pitch) 30%, transparent), transparent 70%)",
          }}
        />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <Reveal variant="up" className="flex items-center gap-3">
            <span className="h-px w-10 bg-[var(--color-arena)]" />
            <p className="inline-flex items-center gap-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-arena)]">
              <Building2 className="size-3.5" />
              {t("heroEyebrow")}
            </p>
            <span className="h-px w-10 bg-[var(--color-arena)]" />
          </Reveal>

          <Reveal
            as="h1"
            variant="up"
            delay={80}
            className="font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
          >
            {t("heroTitle")}
          </Reveal>

          <Reveal
            as="p"
            variant="up"
            delay={160}
            className="max-w-xl font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-lg"
          >
            {t("heroSub")}
          </Reveal>

          <Reveal variant="up" delay={260} className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <a
              href="#planes"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:-translate-y-0.5 hover:opacity-90"
            >
              {t("heroCtaPlans")}
              <ArrowRight className="size-4" />
            </a>
            <a
              href="#contacto"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition hover:-translate-y-0.5 hover:border-[var(--color-arena)]/40"
            >
              {t("heroCtaQuote")}
            </a>
          </Reveal>

          {/* Stats — los números que el comprador B2B quiere ver. */}
          <Reveal variant="up" delay={340} className="grid w-full max-w-xl grid-cols-3 gap-2 pb-12 pt-4 sm:gap-3">
            <HeroStat to={250} label={t("heroStat1")} />
            <HeroStat to={6} label={t("heroStat2")} />
            <HeroStat to={4} label={t("heroStat3")} />
          </Reveal>
        </div>

        {/* Ticker marquee — full bleed, pegado al borde inferior del hero. */}
        <div className="relative -mx-4 overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 lg:-mx-8">
          <div className="marquee flex w-max items-center whitespace-nowrap">
            {[0, 1].map((dup) => (
              <span
                key={dup}
                aria-hidden={dup === 1}
                className="flex items-center font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]"
              >
                {TICKER.map((item, i) => (
                  <span key={i} className="flex items-center">
                    <span className="px-5">{item}</span>
                    <span aria-hidden className="text-[var(--color-arena)]">
                      ●
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      <BuyerLeagueBanner />

      {/* ───────── SHOWCASES · las 3 features estrella, EN PANTALLA ───────── */}
      <section className="space-y-16 sm:space-y-24">
        <Reveal as="header" variant="up" className="space-y-2 text-center">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("showsEyebrow")}
          </p>
          <h2 className="mx-auto max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">
            {t("showsTitle")}
          </h2>
          <p className="mx-auto max-w-2xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            {t("showsIntro")}
          </p>
        </Reveal>

        <FeatureShowcase
          n="01"
          icon={<Paintbrush className="size-4" />}
          kicker={t("scBrandKicker")}
          title={t("scBrandTitle")}
          copy={t("scBrandCopy")}
          points={[t("scBrandP1"), t("scBrandP2"), t("scBrandP3")]}
          tierNote={t("scBrandTier")}
          tierHighlight
          ctaLabel={t("heroCtaPlans")}
          shot={
            <ShowcaseShot
              shot={shots.branding}
              alt={t("scBrandAlt")}
              urlLabel="quinielamundial.es · Synaptech World Cup"
              priority
            />
          }
        />

        <FeatureShowcase
          n="02"
          flip
          icon={<Layers className="size-4" />}
          kicker={t("scDeptKicker")}
          title={t("scDeptTitle")}
          copy={t("scDeptCopy")}
          points={[t("scDeptP1"), t("scDeptP2"), t("scDeptP3")]}
          tierNote={t("scDeptTier")}
          ctaLabel={t("heroCtaPlans")}
          shot={
            <ShowcaseShot
              shot={shots.depts}
              alt={t("scDeptAlt")}
              urlLabel="quinielamundial.es · Synaptech World Cup"
            />
          }
        />

        <FeatureShowcase
          n="03"
          icon={<Megaphone className="size-4" />}
          kicker={t("scBannerKicker")}
          title={t("scBannerTitle")}
          copy={t("scBannerCopy")}
          points={[t("scBannerP1"), t("scBannerP2"), t("scBannerP3")]}
          tierNote={t("scBannerTier")}
          ctaLabel={t("heroCtaPlans")}
          shot={
            <ShowcaseShot
              shot={shots.banner}
              alt={t("scBannerAlt")}
              urlLabel="quinielamundial.es · Synaptech World Cup"
            />
          }
        />

        <Reveal variant="fade" className="flex items-center justify-center gap-3">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("shotsNote")}
          </p>
          <span className="h-px w-6 bg-[var(--color-arena)]" />
        </Reveal>
      </section>

      {/* ───────── PLANES ───────── */}
      <section id="planes" className="scroll-mt-24 space-y-8">
        <Reveal as="header" variant="up" className="space-y-2 text-center">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("plansEyebrow")}
          </p>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            {t("plansTitle")}
          </h2>
          <p className="mx-auto max-w-2xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            {t("plansIntro")}
          </p>
        </Reveal>

        <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan, i) => (
            <Reveal
              as="article"
              variant="up"
              delay={i * 90}
              key={plan.id}
              className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-all hover:-translate-y-1 ${
                plan.highlight
                  ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] shadow-[var(--shadow-arena)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-arena)]/40 hover:shadow-[var(--shadow-elev-1)]"
              }`}
            >
              {plan.highlight ? (
                <>
                  <div
                    aria-hidden
                    className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
                  />
                  <span className="absolute right-4 top-4 rounded-full bg-[var(--color-arena)] px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white">
                    {t("mostPopular")}
                  </span>
                </>
              ) : null}
              <header className="relative space-y-1">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-2">
                  <p
                    className={`font-display text-4xl tracking-tight ${
                      plan.paidTierId ? "text-[var(--color-arena)] glow-arena" : ""
                    }`}
                  >
                    {plan.price}
                  </p>
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

              <div className="relative mt-4 border-y border-[var(--color-border)] py-3">
                <p className="font-display text-lg tracking-tight text-[var(--color-arena)]">
                  {plan.members}
                </p>
                {plan.perPerson ? (
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    ≈ {plan.perPerson}
                  </p>
                ) : null}
              </div>

              {/* Lista de features del plan */}
              <ul className="relative mt-4 flex-1 space-y-2.5">
                {plan.inherits ? (
                  <li className="pb-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    {plan.inherits}
                  </li>
                ) : null}
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[var(--color-arena)] text-white">
                      <Check className="size-2.5" />
                    </span>
                    <span className="text-[0.85rem] leading-snug">{f}</span>
                  </li>
                ))}
                {plan.missing?.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[var(--color-muted-foreground)]/70"
                  >
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-[var(--color-border-strong)]">
                      <X className="size-2.5" />
                    </span>
                    <span className="text-[0.85rem] leading-snug line-through decoration-[var(--color-border-strong)]">
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="relative mt-5">
                <PlanCTA plan={plan} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Enterprise ─── */}
      <Reveal
        as="section"
        variant="up"
        className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-10"
      >
        <div aria-hidden className="pitch-grid absolute inset-0 opacity-20" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {t("entEyebrow")}
            </p>
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
              {t("entTitle")}
            </h2>
            <p className="max-w-xl font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)]">
              {t("entDesc")}
            </p>
          </div>
          <a
            href="#contacto"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
          >
            {t("contact")} <ArrowRight className="size-3.5" />
          </a>
        </div>
      </Reveal>

      {/* ─── FAQ ─── */}
      <section className="space-y-4">
        <Reveal as="header" variant="up" className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("faqEyebrow")}
          </h2>
        </Reveal>
        <Reveal variant="up" className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
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
        </Reveal>
      </section>

      {/* ─── Formulario de contacto ─── */}
      <section
        id="contacto"
        className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-8 sm:p-10"
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

// ─────────── Helpers ───────────

function HeroStat({ to, label }: { to: number; label: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-3 backdrop-blur-sm">
      <p className="font-display tabular text-3xl leading-none tracking-tight text-[var(--color-arena)] sm:text-4xl">
        <Counter to={to} />
      </p>
      <p className="pt-1.5 font-mono text-[0.5rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] sm:text-[0.55rem]">
        {label}
      </p>
    </div>
  );
}

/**
 * Sección zigzag de feature premium: número fantasma gigante, kicker,
 * título display, copy editorial, 3 puntos y chip de disponibilidad por
 * tier — con la captura real del producto al lado (debajo en móvil).
 */
function FeatureShowcase({
  n,
  flip = false,
  icon,
  kicker,
  title,
  copy,
  points,
  tierNote,
  tierHighlight = false,
  ctaLabel,
  shot,
}: {
  n: string;
  flip?: boolean;
  icon: React.ReactNode;
  kicker: string;
  title: string;
  copy: string;
  points: string[];
  tierNote: string;
  /** true → chip relleno arena (feature de tier superior, p. ej. Branding). */
  tierHighlight?: boolean;
  ctaLabel: string;
  shot: React.ReactNode;
}) {
  return (
    <article className="relative grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      {/* Número fantasma de fondo */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-12 hidden select-none font-display text-[11rem] leading-none tracking-tighter text-[var(--color-arena)]/[0.07] lg:block ${
          flip ? "right-0" : "left-0"
        }`}
      >
        {n}
      </span>

      <Reveal
        variant={flip ? "right" : "left"}
        className={`relative space-y-4 ${flip ? "lg:order-2" : ""}`}
      >
        <p className="inline-flex items-center gap-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-arena)]">
          <span className="grid size-7 place-items-center rounded-md border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_10%,transparent)]">
            {icon}
          </span>
          {n} · {kicker}
        </p>
        <h3 className="font-display text-3xl leading-[1.02] tracking-tight sm:text-4xl lg:text-5xl">
          {title}
        </h3>
        <p className="max-w-xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
          {copy}
        </p>
        <ul className="space-y-2 pt-1">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[var(--color-arena)] text-white">
                <Check className="size-2.5" />
              </span>
              <span className="text-sm leading-snug">{p}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.18em] ${
              tierHighlight
                ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
                : "border border-[var(--color-arena)]/40 text-[var(--color-arena)]"
            }`}
          >
            {tierNote}
          </span>
          <a
            href="#planes"
            className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
          >
            {ctaLabel} <ArrowRight className="size-3" />
          </a>
        </div>
      </Reveal>

      <Reveal
        variant={flip ? "left" : "right"}
        delay={120}
        className={flip ? "lg:order-1" : ""}
      >
        {shot}
      </Reveal>
    </article>
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
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-foreground)] transition hover:border-[var(--color-arena)]/40"
      >
        {plan.ctaLabel} <ArrowRight className="size-3.5" />
      </Link>
    );
  }
  if (plan.paidTierId) {
    return (
      <Link
        href={`/precios/comprar/${plan.paidTierId}`}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 font-mono text-[0.65rem] uppercase tracking-[0.18em] transition ${arenaClasses}`}
      >
        {plan.ctaLabel} <ArrowRight className="size-3.5" />
      </Link>
    );
  }
  return (
    <a
      href="#contacto"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 font-mono text-[0.65rem] uppercase tracking-[0.18em] transition ${arenaClasses}`}
    >
      Contactar <ArrowRight className="size-3.5" />
    </a>
  );
}
