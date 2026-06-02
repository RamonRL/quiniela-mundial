import Link from "next/link";
import { ArrowRight, Crown, Goal, ListChecks, Sparkles, Swords, Target, Trophy, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { PageHeader } from "@/components/shell/page-header";
import { ScoringTable, type ScoringSection } from "@/components/brand/scoring-box";
import {
  bracketScoring,
  groupsScoring,
  matchGroupScoring,
  matchFinalScoring,
  scorerScoring,
  soloGroupScoring,
  soloFinalScoring,
  specialsScoring,
  topScorerScoring,
} from "@/lib/scoring/copy";
import {
  PREDICTION_MODES,
  isPredictionMode,
  type PredictionMode,
} from "@/lib/prediction-modes";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Cómo se puntúa · Las 6 categorías",
  description:
    "Sistema de puntuación de la Quiniela del Mundial 2026: las 6 categorías de predicción y los puntos que da cada acierto. Marcador exacto, bracket, Bota de Oro, posiciones por grupo, goleador por partido y predicciones especiales.",
  alternates: { canonical: "/puntuacion" },
  openGraph: {
    title: "Cómo se puntúa · Quiniela Mundial 2026",
    description:
      "Breakdown completo: por qué un marcador exacto vale 5 pts, cómo se cuentan los bonus de eliminatoria y qué te da más puntos en una sola jugada.",
    url: "/puntuacion",
  },
};

type Category = {
  id: string;
  icon: React.ReactNode;
  cat: string;
  title: string;
  tagline: string;
  sections: ScoringSection[];
};

export default async function PuntuacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ modo?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = (await searchParams) ?? {};
  const mode: PredictionMode = isPredictionMode(sp.modo ?? "")
    ? (sp.modo as PredictionMode)
    : "completo";

  const t = await getTranslations("scoring");
  const tp = await getTranslations("scoringPage");
  const tm = await getTranslations("modes");
  const tNav = await getTranslations("nav");

  // Categorías del modo completo (las 6 de siempre).
  const COMPLETO_CATEGORIES: Category[] = [
    {
      id: "grupos",
      icon: <Users className="size-5" />,
      cat: "01",
      title: tp("gruposTitle"),
      tagline: tp("gruposTagline"),
      sections: groupsScoring(t),
    },
    {
      id: "bracket",
      icon: <Swords className="size-5" />,
      cat: "02",
      title: tp("bracketTitle"),
      tagline: tp("bracketTagline"),
      sections: bracketScoring(t),
    },
    {
      id: "bota",
      icon: <Target className="size-5" />,
      cat: "03",
      title: tp("botaTitle"),
      tagline: tp("botaTagline"),
      sections: topScorerScoring(t),
    },
    {
      id: "marcadores",
      icon: <ListChecks className="size-5" />,
      cat: "04",
      title: tp("marcadoresTitle"),
      tagline: tp("marcadoresTagline"),
      sections: [matchGroupScoring(t), matchFinalScoring(t)],
    },
    {
      id: "goleador-partido",
      icon: <Goal className="size-5" />,
      cat: "05",
      title: tp("goleadorTitle"),
      tagline: tp("goleadorTagline"),
      sections: [scorerScoring(t)],
    },
    {
      id: "especiales",
      icon: <Sparkles className="size-5" />,
      cat: "06",
      title: tp("especialesTitle"),
      tagline: tp("especialesTagline"),
      sections: specialsScoring(t),
    },
  ];

  // Modos marcador y solo_ganador: una sola categoría (predicción de partido),
  // con las reglas separadas por fase.
  const MARCADOR_CATEGORIES: Category[] = [
    {
      id: "marcadores",
      icon: <ListChecks className="size-5" />,
      cat: "01",
      title: tp("marcadoresTitle"),
      tagline: tp("marcadorModeTagline"),
      sections: [matchGroupScoring(t), matchFinalScoring(t)],
    },
  ];

  const SOLO_GANADOR_CATEGORIES: Category[] = [
    {
      id: "ganador",
      icon: <Trophy className="size-5" />,
      cat: "01",
      title: tp("ganadorTitle"),
      tagline: tp("ganadorTagline"),
      sections: [soloGroupScoring(t), soloFinalScoring(t)],
    },
  ];

  const CATEGORIES_BY_MODE: Record<PredictionMode, Category[]> = {
    completo: COMPLETO_CATEGORIES,
    marcador: MARCADOR_CATEGORIES,
    solo_ganador: SOLO_GANADOR_CATEGORIES,
  };

  const categories = CATEGORIES_BY_MODE[mode];
  const showJumpGrid = mode === "completo";

  return (
    <div className="space-y-12">
      <BreadcrumbLD
        items={[
          { name: tNav("inicio"), href: "/" },
          { name: tp("breadcrumb"), href: "/puntuacion" },
        ]}
      />

      <PageHeader
        eyebrow={tp("headerEyebrow")}
        title={tp("headerTitle")}
        description={tp("headerDesc")}
      />

      {/* Selector de modo */}
      <nav className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {PREDICTION_MODES.map((m) => {
          const active = m === mode;
          return (
            <Link
              key={m}
              href={`/puntuacion?modo=${m}`}
              scroll={false}
              className={cn(
                "inline-flex shrink-0 items-center rounded-md px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]",
              )}
            >
              {tm(m)}
            </Link>
          );
        })}
      </nav>

      {/* Resumen visual (solo modo completo, con sus 6 categorías) */}
      {showJumpGrid ? (
        <section>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`#${c.id}`}
                  className="group flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 transition hover:border-[var(--color-arena)]/50 hover:bg-[var(--color-surface-2)]"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-arena)]">
                    {c.icon}
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {tp("catPrefix")} {c.cat}
                    </p>
                    <p className="truncate py-0.5 font-display text-sm leading-normal tracking-tight">
                      {c.title}
                    </p>
                  </div>
                  <ArrowRight className="size-3.5 shrink-0 text-[var(--color-muted-foreground)] transition group-hover:text-[var(--color-arena)]" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Categorías una a una (del modo activo) */}
      <div className="space-y-10">
        {categories.map((c) => (
          <CategoryBlock
            key={c.id}
            category={c}
            categoryPrefix={tp("categoryPrefix")}
          />
        ))}
      </div>

      {/* CTA al final */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-8 text-center sm:p-10">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div className="relative space-y-3">
          <div className="inline-flex items-center gap-2">
            <Crown className="size-4 text-[var(--color-arena)]" />
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
              {tp("ctaEyebrow")}
            </p>
          </div>
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            {tp("ctaTitle")}
          </h2>
          <p className="mx-auto max-w-xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            {tp("ctaText")}
          </p>
          <div className="pt-2">
            <Link
              href="/login?next=%2Fonboarding"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
            >
              {tp("ctaButton")}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoryBlock({
  category,
  categoryPrefix,
}: {
  category: Category;
  categoryPrefix: string;
}) {
  return (
    <section id={category.id} className="scroll-mt-24 space-y-4">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-arena)]">
          {category.icon}
        </span>
        <div className="space-y-1">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {categoryPrefix} {category.cat}
          </p>
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            {category.title}
          </h2>
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
            {category.tagline}
          </p>
        </div>
      </header>

      <ScoringTable sections={category.sections} />
    </section>
  );
}
