import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { NewsCard } from "@/components/news/news-card";
import {
  countPublishedNews,
  listPublishedNews,
} from "@/lib/news/queries";
import {
  getCategoryMeta,
  NEWS_CATEGORIES,
  NEWS_CATEGORY_KEYS,
} from "@/lib/news/categories";

export const revalidate = 300;

const PAGE_SIZE = 12;

type Params = Promise<{ cat: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateStaticParams() {
  return NEWS_CATEGORY_KEYS.map((cat) => ({ cat }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { cat } = await params;
  const meta = getCategoryMeta(cat);
  if (!meta) return { title: "Categoría no encontrada", robots: { index: false } };
  return {
    title: meta.seoH1,
    description: meta.seoIntro,
    alternates: { canonical: `/noticias/categoria/${cat}` },
    openGraph: {
      title: meta.seoH1,
      description: meta.seoIntro,
      url: `/noticias/categoria/${cat}`,
      type: "website",
    },
  };
}

export default async function NewsCategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { cat } = await params;
  const meta = getCategoryMeta(cat);
  if (!meta) notFound();

  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [items, total] = await Promise.all([
    listPublishedNews({ category: meta.key, limit: PAGE_SIZE, offset }),
    countPublishedNews({ category: meta.key }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-10">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Noticias", href: "/noticias" },
          {
            name: meta.pluralLabel,
            href: `/noticias/categoria/${meta.key}`,
          },
        ]}
      />
      <PageHeader
        eyebrow={`Noticias · ${meta.pluralLabel}`}
        title={meta.seoH1}
        description={meta.seoIntro}
      />

      {/* Pills — incluye link "Todas" + resto de categorías para
          internal-linking cruzado. */}
      <nav aria-label="Categorías" className="flex flex-wrap gap-2">
        <Link
          href="/noticias"
          className="rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.24em] transition hover:border-[var(--color-arena)]/40"
        >
          Todas
        </Link>
        {NEWS_CATEGORY_KEYS.map((k) => {
          const c = NEWS_CATEGORIES[k];
          const active = k === meta.key;
          return (
            <Link
              key={k}
              href={`/noticias/categoria/${k}`}
              className={`rounded-full border px-3 py-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.24em] transition ${
                active
                  ? "border-[var(--color-arena)] bg-[var(--color-arena)] text-white"
                  : "border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:border-[var(--color-arena)]/60 hover:text-[var(--color-arena)]"
              }`}
            >
              {c.pluralLabel}
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <EmptyState
          title={`Aún no hay ${meta.pluralLabel.toLowerCase()}`}
          description="Vuelve en unos días — estamos publicando contenido todas las semanas."
          action={
            <Link
              href="/noticias"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              Ver todas las noticias
            </Link>
          }
        />
      ) : (
        <>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((n) => (
              <li key={n.id}>
                <NewsCard {...n} />
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <CategoryPagination
              page={page}
              totalPages={totalPages}
              cat={meta.key}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function CategoryPagination({
  page,
  totalPages,
  cat,
}: {
  page: number;
  totalPages: number;
  cat: string;
}) {
  const base = `/noticias/categoria/${cat}`;
  const prev = page - 1;
  const next = page + 1;
  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between border-t border-[var(--color-border)] pt-6"
    >
      <Link
        href={prev > 1 ? `${base}?page=${prev}` : base}
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
        href={`${base}?page=${next}`}
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
