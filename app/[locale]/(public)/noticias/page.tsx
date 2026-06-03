import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { NewsCard, CategoryBadge } from "@/components/news/news-card";
import {
  countPublishedNews,
  listPublishedNews,
} from "@/lib/news/queries";
import { NEWS_CATEGORIES, NEWS_CATEGORY_KEYS } from "@/lib/news/categories";

// Revalidamos cada 5 min — suficiente para que un artículo publicado
// salga rápido sin pegarle a Postgres en cada visita.
export const revalidate = 300;

// 13 = 1 hero arriba + 12 en grid de 3 columnas (4 filas completas).
// Con 12 quedaba la última fila con 2 cards descuadrada.
const PAGE_SIZE = 13;

export const metadata: Metadata = {
  title: "Noticias del Mundial 2026",
  description:
    "Convocatorias, previas, crónicas y análisis del Mundial 2026 en USA, Canadá y México. Lo último de las 48 selecciones, jugadores y partidos.",
  alternates: { canonical: "/noticias" },
  openGraph: {
    title: "Noticias del Mundial 2026",
    description:
      "Convocatorias, previas y crónicas de las 48 selecciones del Mundial 2026.",
    url: "/noticias",
    type: "website",
  },
};

type SearchParams = Promise<{ page?: string }>;

export default async function NewsIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [items, total] = await Promise.all([
    listPublishedNews({ limit: PAGE_SIZE, offset }),
    countPublishedNews(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [hero, ...rest] = items;

  return (
    <div className="space-y-10">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Noticias", href: "/noticias" },
        ]}
      />
      <PageHeader
        eyebrow="Mundial 2026"
        title="Noticias"
        description="Convocatorias, previas, crónicas y análisis del Mundial 2026. Te contamos lo que pasa en las 48 selecciones, en los 104 partidos y en las 16 sedes — antes, durante y después de cada jornada."
      />

      {/* Pills de categorías — internal linking pesado, captura long-tail. */}
      <nav
        aria-label="Categorías de noticias"
        className="flex flex-wrap gap-2"
      >
        <Link
          href="/noticias"
          className="rounded-full border border-[var(--color-arena)] bg-[var(--color-arena)] px-3 py-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-white"
        >
          Todas
        </Link>
        {NEWS_CATEGORY_KEYS.map((k) => {
          const cat = NEWS_CATEGORIES[k];
          return (
            <Link
              key={k}
              href={`/noticias/categoria/${k}`}
              className="rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.24em] transition hover:border-[var(--color-arena)]/60 hover:text-[var(--color-arena)]"
            >
              {cat.pluralLabel}
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <EmptyState
          title="Aún no hay noticias publicadas"
          description="Estamos preparando el primer lote de convocatorias y previas. Vuelve en unos días."
        />
      ) : (
        <>
          {/* Hero — la noticia más reciente con tamaño grande. */}
          {hero ? (
            <NewsCard
              slug={hero.slug}
              title={hero.title}
              excerpt={hero.excerpt}
              coverUrl={hero.coverUrl}
              coverAlt={hero.coverAlt}
              category={hero.category}
              publishedAt={hero.publishedAt}
              variant="hero"
            />
          ) : null}

          {/* Resto del feed */}
          {rest.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((n) => (
                <li key={n.id}>
                  <NewsCard {...n} />
                </li>
              ))}
            </ul>
          ) : null}

          {totalPages > 1 ? (
            <Pagination page={page} totalPages={totalPages} />
          ) : null}
        </>
      )}

      {/* Bloque SEO de categorías — al pie, links ricos en keywords. */}
      <section className="space-y-4 border-t border-[var(--color-border)] pt-10">
        <h2 className="font-display text-2xl tracking-tight">
          Explora las noticias por categoría
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NEWS_CATEGORY_KEYS.map((k) => {
            const cat = NEWS_CATEGORIES[k];
            return (
              <li key={k}>
                <Link
                  href={`/noticias/categoria/${k}`}
                  className="group flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-arena)]/40"
                >
                  <CategoryBadge tone={cat.tone} label={cat.label} />
                  <div className="flex-1 space-y-1">
                    <p className="font-display text-base tracking-tight">
                      {cat.pluralLabel}
                    </p>
                    <p className="line-clamp-2 font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                      {cat.seoIntro}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-[var(--color-arena)] transition group-hover:translate-x-1" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const prev = page - 1;
  const next = page + 1;
  return (
    <nav
      aria-label="Paginación de noticias"
      className="flex items-center justify-between border-t border-[var(--color-border)] pt-6"
    >
      <Link
        href={prev > 1 ? `/noticias?page=${prev}` : "/noticias"}
        aria-disabled={page <= 1}
        className={`inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] transition ${
          page <= 1
            ? "pointer-events-none opacity-30"
            : "hover:border-[var(--color-arena)]/40"
        }`}
      >
        ← Anterior
      </Link>
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
        Página {page} de {totalPages}
      </p>
      <Link
        href={`/noticias?page=${next}`}
        aria-disabled={page >= totalPages}
        className={`inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] transition ${
          page >= totalPages
            ? "pointer-events-none opacity-30"
            : "hover:border-[var(--color-arena)]/40"
        }`}
      >
        Siguiente →
      </Link>
    </nav>
  );
}
