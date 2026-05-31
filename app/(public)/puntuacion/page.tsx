import Link from "next/link";
import { ArrowRight, Crown, Goal, ListChecks, Sparkles, Swords, Target, Trophy, Users } from "lucide-react";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { PageHeader } from "@/components/shell/page-header";
import { ScoringBox, type ScoringSection } from "@/components/brand/scoring-box";
import {
  BRACKET_FOOTNOTE,
  BRACKET_SCORING,
  GROUPS_FOOTNOTE,
  GROUPS_SCORING,
  MATCH_FOOTNOTE,
  MATCH_SCORING,
  MATCH_SCORING_MARCADOR,
  MATCH_SCORING_SOLO_GANADOR,
  SPECIALS_FOOTNOTE,
  SPECIALS_SCORING,
  TOP_SCORER_SCORING,
} from "@/lib/scoring/copy";
import {
  PREDICTION_MODES,
  PREDICTION_MODE_META,
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
  footnote?: string;
  maxLine?: string;
};

// Categorías del modo completo (las 6 de siempre).
const COMPLETO_CATEGORIES: Category[] = [
  {
    id: "grupos",
    icon: <Users className="size-5" />,
    cat: "01",
    title: "Posiciones por grupo",
    tagline:
      "Ordena los 4 equipos de cada uno de los 12 grupos del 1º al 4º. Cierra al kickoff del torneo.",
    sections: GROUPS_SCORING,
    footnote: GROUPS_FOOTNOTE,
    maxLine: "13 pts × 12 grupos = hasta 156 pts en juego.",
  },
  {
    id: "bracket",
    icon: <Swords className="size-5" />,
    cat: "02",
    title: "Bracket FIFA completo",
    tagline:
      "Predices quién pasa ronda a ronda — de los 16avos a la final. Cierra al cerrar la fase de grupos.",
    sections: BRACKET_SCORING,
    footnote: BRACKET_FOOTNOTE,
    maxLine: "Puntos acumulables por cada equipo que acierta en cada ronda.",
  },
  {
    id: "bota",
    icon: <Target className="size-5" />,
    cat: "03",
    title: "Bota de Oro",
    tagline:
      "Tu candidato a goleador del torneo. Una sola predicción que cierra al kickoff.",
    sections: TOP_SCORER_SCORING,
    maxLine: "Hasta 15 pts si clavas el goleador exacto.",
  },
  {
    id: "marcadores",
    icon: <ListChecks className="size-5" />,
    cat: "04",
    title: "Marcador partido a partido",
    tagline:
      "Marcador exacto + ganador + bonuses en eliminatoria. Cada partido cierra a su pitido inicial.",
    sections: MATCH_SCORING,
    footnote: MATCH_FOOTNOTE,
    maxLine: "11 pts en grupos · 16 pts en KO si lo clavas todo en un partido.",
  },
  {
    id: "goleador-partido",
    icon: <Goal className="size-5" />,
    cat: "05",
    title: "Goleador por partido",
    tagline:
      "Apuntas a un jugador del partido. Si marca sumas, y aún más si es el primero del partido.",
    sections: [
      {
        rules: [
          { points: 4, label: "Tu jugador anota un gol en el partido" },
          {
            points: 2,
            prefix: "+",
            label: "Bonus si además es el primer gol del partido",
            bonus: true,
          },
        ],
      },
    ],
    maxLine: "Compatible con el marcador del partido — los aciertos se suman.",
  },
  {
    id: "especiales",
    icon: <Sparkles className="size-5" />,
    cat: "06",
    title: "Predicciones especiales",
    tagline:
      "Preguntas con sabor: Balón de Oro, Guante de Oro, anfitrión más lejos, ¿África llega a semifinales?…",
    sections: SPECIALS_SCORING,
    footnote: SPECIALS_FOOTNOTE,
    maxLine: "Cada especial reparte sus propios puntos.",
  },
];

// Modos marcador y solo_ganador: una sola categoría (predicción de partido).
const MARCADOR_CATEGORIES: Category[] = [
  {
    id: "marcadores",
    icon: <ListChecks className="size-5" />,
    cat: "01",
    title: "Marcador partido a partido",
    tagline:
      "Predices el marcador exacto de cada partido. En eliminatoria, un empate implica penaltis y eliges quién pasa. Sin grupos, bracket ni goleadores.",
    sections: MATCH_SCORING_MARCADOR,
    maxLine: "Marcador exacto 5 · ganador 2 · extras de eliminatoria.",
  },
];

const SOLO_GANADOR_CATEGORIES: Category[] = [
  {
    id: "ganador",
    icon: <Trophy className="size-5" />,
    cat: "01",
    title: "Ganador del partido",
    tagline:
      "Solo predices quién gana cada partido (o empate). En eliminatoria, si predices empate eliges también quién pasa en penaltis. Lo más rápido de rellenar.",
    sections: MATCH_SCORING_SOLO_GANADOR,
    maxLine: "3 pts por acierto · +2 en KO por acertar el ganador de la tanda.",
  },
];

const CATEGORIES_BY_MODE: Record<PredictionMode, Category[]> = {
  completo: COMPLETO_CATEGORIES,
  marcador: MARCADOR_CATEGORIES,
  solo_ganador: SOLO_GANADOR_CATEGORIES,
};

export default async function PuntuacionPage({
  searchParams,
}: {
  searchParams?: Promise<{ modo?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const mode: PredictionMode = isPredictionMode(sp.modo ?? "") ? (sp.modo as PredictionMode) : "completo";
  const categories = CATEGORIES_BY_MODE[mode];
  const showJumpGrid = mode === "completo";

  return (
    <div className="space-y-12">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Cómo se puntúa", href: "/puntuacion" },
        ]}
      />

      <PageHeader
        eyebrow="Reglas del juego"
        title="Cómo se puntúa"
        description="Cada modo de quiniela tiene su rúbrica. Acertar más implica leer mejor el torneo."
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
              {PREDICTION_MODE_META[m].label}
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
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Cat. {c.cat}
                  </p>
                  <p className="truncate font-display text-sm tracking-tight">
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
          <CategoryBlock key={c.id} category={c} />
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
              Listo para predecir
            </p>
          </div>
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Pon a prueba tu lectura del Mundial
          </h2>
          <p className="mx-auto max-w-xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            La rúbrica es la misma para todos. Quien lea mejor el torneo, gana
            el ranking de su quiniela.
          </p>
          <div className="pt-2">
            <Link
              href="/login?next=%2Fonboarding"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
            >
              Crear mi quiniela
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoryBlock({ category }: { category: Category }) {
  return (
    <section id={category.id} className="scroll-mt-24 space-y-4">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-arena)]">
          {category.icon}
        </span>
        <div className="space-y-1">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Categoría {category.cat}
          </p>
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            {category.title}
          </h2>
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
            {category.tagline}
          </p>
        </div>
      </header>

      <ScoringBox
        title={`Reglas · ${category.title}`}
        sections={category.sections}
        footnote={category.footnote}
        defaultOpen
      />

      {category.maxLine ? (
        <p className="rounded-md border border-dashed border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-bg))] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
          {category.maxLine}
        </p>
      ) : null}
    </section>
  );
}
