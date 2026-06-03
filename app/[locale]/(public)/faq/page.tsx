import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, HelpCircle, Mail } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { BreadcrumbLD, FAQPageLD } from "@/components/seo/jsonld";
import { AnswerText } from "@/components/faq/answer-text";

// FAQ es estático: cacheamos generosamente (24 h).
export const revalidate = 86400;

export const metadata = {
  title: "Preguntas frecuentes",
  description:
    "Cómo funciona Quiniela Mundial 2026: cuentas, quinielas privadas, código de invitación, predicciones, puntos y deadlines.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQs · Quiniela Mundial 2026",
    description:
      "Todo lo que necesitas saber sobre Quiniela Mundial 2026: cuentas, quinielas privadas, predicciones y puntos.",
    url: "/faq",
  },
};

type Faq = { q: string; a: string };

// Estructura de secciones (nº de FAQs por bloque). Los textos viven en el
// catálogo i18n (faqPage.sN.title / sN.qX / sN.aX) y se construyen en render.
const SECTION_DEFS = [
  { key: "s1", count: 6 },
  { key: "s2", count: 3 },
  { key: "s3", count: 6 },
  { key: "s4", count: 6 },
  { key: "s5", count: 3 },
] as const;

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faqPage");
  const tNav = await getTranslations("nav");
  const sections: { title: string; faqs: Faq[] }[] = SECTION_DEFS.map(
    ({ key, count }) => ({
      title: t(`${key}.title`),
      faqs: Array.from({ length: count }, (_, j) => ({
        q: t(`${key}.q${j + 1}`),
        a: t(`${key}.a${j + 1}`),
      })),
    }),
  );
  const allFaqs = sections.flatMap((s) => s.faqs);
  return (
    <div className="space-y-12">
      <BreadcrumbLD
        items={[
          { name: tNav("inicio"), href: "/" },
          { name: tNav("faqs"), href: "/faq" },
        ]}
      />
      <FAQPageLD faqs={allFaqs} />

      <PageHeader
        eyebrow={t("headerEyebrow")}
        title={t("headerTitle")}
        description={t("headerDesc")}
      />

      <div className="space-y-10">
        {sections.map((section, i) => (
          <section key={i} className="space-y-4">
            <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
              <span className="font-display text-xl tracking-tight text-[var(--color-arena)] glow-arena">
                {(i + 1).toString().padStart(2, "0")}
              </span>
              <h2 className="font-display text-2xl tracking-tight">
                {section.title}
              </h2>
            </header>
            <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              {section.faqs.map((f, j) => (
                <details key={j} className="group px-5 py-4">
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
                    <AnswerText text={f.a} />
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA al final → mover al usuario a Contacto si no encuentra la
          respuesta que buscaba. */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-8 text-center">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div className="relative space-y-3">
          <span className="grid mx-auto size-12 place-items-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
            <HelpCircle className="size-5" />
          </span>
          <p className="font-display text-2xl tracking-tight">
            {t("ctaTitle")}
          </p>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("ctaText")}
          </p>
          <Link
            href="/contacto"
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
          >
            {t("ctaButton")}
            <ArrowRight className="size-3.5" />
          </Link>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("ctaOr")}{" "}
            <a
              href="mailto:admin@quinielamundial.es"
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
