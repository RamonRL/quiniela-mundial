import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, teams } from "@/lib/db/schema";
import {
  BreadcrumbLD,
  NewsArticleLD,
} from "@/components/seo/jsonld";
import { NewsCard, CategoryBadge } from "@/components/news/news-card";
import { NewsBody } from "@/components/news/news-body";
import { TeamFlag } from "@/components/brand/team-flag";
import { getNewsBySlug, getRelatedNews } from "@/lib/news/queries";
import { NEWS_CATEGORIES } from "@/lib/news/categories";
import { formatDateTime } from "@/lib/utils";

// Detalle de un artículo — ISR con revalidación cada 10 min. NO usamos
// `dynamic = "force-static"` a propósito: forzar static cachearía el
// layout (que es server-rendered y depende de `cookies()` para decidir
// si pintar el shell público o el de usuario logueado), congelando
// el HTML para todos en su versión "anónima". Con sólo `revalidate`
// y el layout que llama `cookies()`, el route segment es dinámico —
// el cuerpo del artículo se cachea a nivel de datos vía las queries,
// pero el shell se renderiza fresco por petición y refleja la sesión.
export const revalidate = 600;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);
  if (!article) {
    return { title: "Noticia no encontrada", robots: { index: false } };
  }
  const title = article.seoTitle ?? article.title;
  const description = article.excerpt;
  const ogImages = article.coverUrl
    ? [{ url: article.coverUrl, alt: article.coverAlt ?? article.title }]
    : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/noticias/${slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/noticias/${slug}`,
      publishedTime: article.publishedAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      section: NEWS_CATEGORIES[article.category].label,
      tags: article.tags,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: article.coverUrl ? [article.coverUrl] : undefined,
    },
    keywords: [
      ...article.tags,
      NEWS_CATEGORIES[article.category].pluralLabel,
      "Mundial 2026",
    ],
  };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);
  if (!article) notFound();

  const cat = NEWS_CATEGORIES[article.category];

  // Cargamos los teams relacionados (para badges con bandera) y el
  // partido si lo hay — en una pasada por DB.
  const [relatedTeamRows, relatedMatchRow] = await Promise.all([
    article.relatedTeamCodes.length > 0
      ? db
          .select({ code: teams.code, name: teams.name })
          .from(teams)
          .where(inArray(teams.code, article.relatedTeamCodes))
      : Promise.resolve([] as Array<{ code: string; name: string }>),
    article.relatedMatchId
      ? db
          .select({
            id: matches.id,
            scheduledAt: matches.scheduledAt,
            homeTeamId: matches.homeTeamId,
            awayTeamId: matches.awayTeamId,
            venue: matches.venue,
          })
          .from(matches)
          .where(eq(matches.id, article.relatedMatchId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  const related = await getRelatedNews(
    {
      slug: article.slug,
      category: article.category,
      relatedTeamCodes: article.relatedTeamCodes,
    },
    4,
  );

  const dateLabel = formatDateTime(article.publishedAt, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const readMinutes = Math.max(1, Math.round(article.body.split(/\s+/).length / 230));
  // El authorName se mantiene para JSON-LD (Google exige `author` en
  // NewsArticle schema), aunque ya no se renderiza en la cabecera.
  const authorName = article.author?.nickname ?? "Redacción Quiniela Mundial";

  return (
    <article className="space-y-10">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Noticias", href: "/noticias" },
          {
            name: cat.pluralLabel,
            href: `/noticias/categoria/${cat.key}`,
          },
          { name: article.title, href: `/noticias/${article.slug}` },
        ]}
      />
      <NewsArticleLD
        slug={article.slug}
        headline={article.title}
        description={article.excerpt}
        image={article.coverUrl}
        datePublished={article.publishedAt}
        dateModified={article.updatedAt}
        section={cat.label}
        keywords={[
          ...article.tags,
          cat.pluralLabel,
          "Mundial 2026",
        ]}
        authorName={authorName}
      />

      {/* Mini-breadcrumb visible — refuerza el JSON-LD para usuarios. */}
      <nav
        aria-label="Migas de pan"
        className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]"
      >
        <Link href="/noticias" className="inline-flex items-center gap-1.5 hover:text-[var(--color-arena)]">
          <ArrowLeft className="size-3" />
          Noticias
        </Link>
        <span aria-hidden>·</span>
        <Link
          href={`/noticias/categoria/${cat.key}`}
          className="hover:text-[var(--color-arena)]"
        >
          {cat.pluralLabel}
        </Link>
      </nav>

      <header className="space-y-5">
        <CategoryBadge tone={cat.tone} label={cat.label} />
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          {article.title}
        </h1>
        <p className="max-w-3xl font-editorial text-lg italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-xl">
          {article.excerpt}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
          <time dateTime={article.publishedAt.toISOString()}>{dateLabel}</time>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3" /> {readMinutes} min lectura
          </span>
        </div>
      </header>

      {article.coverUrl ? (
        <figure className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <div className="relative aspect-[16/9] w-full">
            <Image
              src={article.coverUrl}
              alt={article.coverAlt ?? article.title}
              fill
              priority
              sizes="(min-width: 1024px) 960px, 100vw"
              className="object-cover"
            />
          </div>
          {article.coverAlt ? (
            <figcaption className="border-t border-[var(--color-border)] px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              {article.coverAlt}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="mx-auto max-w-3xl">
        <NewsBody body={article.body} />
      </div>

      {/* ─── Vinculación a producto: equipos + partido relacionados ─── */}
      {(relatedTeamRows.length > 0 || relatedMatchRow) && (
        <aside className="mx-auto max-w-3xl space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
            Relacionado en la quiniela
          </p>
          {relatedTeamRows.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {relatedTeamRows.map((t) => (
                <li key={t.code}>
                  <Link
                    href={`/equipos/${t.code}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm transition hover:border-[var(--color-arena)]/40 hover:text-[var(--color-arena)]"
                  >
                    <TeamFlag code={t.code} size={18} />
                    <span>{t.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {relatedMatchRow ? (
            <Link
              href={`/partido/${relatedMatchRow.id}`}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] px-4 py-2 text-sm font-semibold transition hover:bg-[color-mix(in_oklch,var(--color-arena)_14%,var(--color-surface))]"
            >
              Ver ficha del partido
              <ArrowRight className="size-4" />
            </Link>
          ) : null}
        </aside>
      )}

      {/* ─── CTA editorial: vista interna SEO + conversion ─── */}
      <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] p-8 text-center">
        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
          ¿Vas a hacer tu quiniela del Mundial?
        </h2>
        <p className="mx-auto mt-2 max-w-xl font-editorial text-sm italic text-[var(--color-muted-foreground)] sm:text-base">
          Predice las posiciones de los 12 grupos, el bracket completo, los
          goleadores y los marcadores partido a partido con tus amigos. Gratis,
          sin Excel ni capturas en WhatsApp.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/login?next=%2Fonboarding"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white"
          >
            Crear quiniela
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            href="/calendario"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
          >
            Ver calendario
          </Link>
        </div>
      </section>

      {/* ─── Noticias relacionadas ─── */}
      {related.length > 0 ? (
        <section className="space-y-5 border-t border-[var(--color-border)] pt-10">
          <h2 className="font-display text-2xl tracking-tight">
            Sigue leyendo
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((n) => (
              <li key={n.id}>
                <NewsCard {...n} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
