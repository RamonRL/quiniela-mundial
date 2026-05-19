import "server-only";
import { and, arrayOverlaps, desc, eq, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsArticles, profiles } from "@/lib/db/schema";
import type { NewsCategoryKey } from "./categories";

export type NewsListItem = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  coverAlt: string | null;
  category: NewsCategoryKey;
  tags: string[];
  relatedTeamCodes: string[];
  publishedAt: Date;
  updatedAt: Date;
};

export type NewsDetail = NewsListItem & {
  body: string;
  seoTitle: string | null;
  relatedMatchId: number | null;
  author: { id: string; nickname: string | null; avatarUrl: string | null } | null;
  createdAt: Date;
  viewCount: number;
};

const baseSelect = {
  id: newsArticles.id,
  slug: newsArticles.slug,
  title: newsArticles.title,
  excerpt: newsArticles.excerpt,
  coverUrl: newsArticles.coverUrl,
  coverAlt: newsArticles.coverAlt,
  category: newsArticles.category,
  tags: newsArticles.tags,
  relatedTeamCodes: newsArticles.relatedTeamCodes,
  publishedAt: newsArticles.publishedAt,
  updatedAt: newsArticles.updatedAt,
};

// Predicado "visible al público": estado published y publishedAt <= ahora.
// Lo factorizamos porque se repite en absolutamente todas las queries
// públicas.
function isPublic() {
  return and(
    eq(newsArticles.status, "published"),
    lte(newsArticles.publishedAt, sql`now()`),
  );
}

export type ListNewsParams = {
  category?: NewsCategoryKey;
  tag?: string;
  teamCode?: string;
  matchId?: number;
  excludeSlug?: string;
  limit?: number;
  offset?: number;
};

export async function listPublishedNews(
  params: ListNewsParams = {},
): Promise<NewsListItem[]> {
  const filters = [isPublic()];
  if (params.category) filters.push(eq(newsArticles.category, params.category));
  if (params.tag) filters.push(arrayOverlaps(newsArticles.tags, [params.tag]));
  if (params.teamCode)
    filters.push(
      arrayOverlaps(newsArticles.relatedTeamCodes, [params.teamCode]),
    );
  if (params.matchId)
    filters.push(eq(newsArticles.relatedMatchId, params.matchId));
  if (params.excludeSlug)
    filters.push(ne(newsArticles.slug, params.excludeSlug));

  const rows = await db
    .select(baseSelect)
    .from(newsArticles)
    .where(and(...filters))
    .orderBy(desc(newsArticles.publishedAt))
    .limit(params.limit ?? 20)
    .offset(params.offset ?? 0);

  return rows.map((r) => ({
    ...r,
    publishedAt: r.publishedAt!,
  }));
}

export async function countPublishedNews(
  params: Pick<ListNewsParams, "category" | "tag" | "teamCode"> = {},
): Promise<number> {
  const filters = [isPublic()];
  if (params.category) filters.push(eq(newsArticles.category, params.category));
  if (params.tag) filters.push(arrayOverlaps(newsArticles.tags, [params.tag]));
  if (params.teamCode)
    filters.push(
      arrayOverlaps(newsArticles.relatedTeamCodes, [params.teamCode]),
    );

  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(newsArticles)
    .where(and(...filters));
  return row?.n ?? 0;
}

export async function getNewsBySlug(slug: string): Promise<NewsDetail | null> {
  const rows = await db
    .select({
      ...baseSelect,
      body: newsArticles.body,
      seoTitle: newsArticles.seoTitle,
      relatedMatchId: newsArticles.relatedMatchId,
      authorId: newsArticles.authorId,
      authorNickname: profiles.nickname,
      authorAvatar: profiles.avatarUrl,
      createdAt: newsArticles.createdAt,
      viewCount: newsArticles.viewCount,
    })
    .from(newsArticles)
    .leftJoin(profiles, eq(profiles.id, newsArticles.authorId))
    .where(and(isPublic(), eq(newsArticles.slug, slug)))
    .limit(1);

  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    coverUrl: r.coverUrl,
    coverAlt: r.coverAlt,
    category: r.category,
    tags: r.tags,
    relatedTeamCodes: r.relatedTeamCodes,
    publishedAt: r.publishedAt!,
    updatedAt: r.updatedAt,
    body: r.body,
    seoTitle: r.seoTitle,
    relatedMatchId: r.relatedMatchId,
    author: r.authorId
      ? {
          id: r.authorId,
          nickname: r.authorNickname,
          avatarUrl: r.authorAvatar,
        }
      : null,
    createdAt: r.createdAt,
    viewCount: r.viewCount,
  };
}

/**
 * Para "Noticias relacionadas" al final del detalle. Devuelve, en este orden:
 * 1. Misma categoría + comparte algún equipo, excluyendo el actual.
 * 2. Misma categoría.
 * 3. Comparte algún equipo (categoría distinta).
 *
 * Si tenemos menos de `limit` con la query rica, completamos con las más
 * recientes para no dejar el bloque vacío.
 */
export async function getRelatedNews(
  current: Pick<NewsDetail, "slug" | "category" | "relatedTeamCodes">,
  limit = 4,
): Promise<NewsListItem[]> {
  const sameTeams = current.relatedTeamCodes.length > 0;

  const primary = await db
    .select(baseSelect)
    .from(newsArticles)
    .where(
      and(
        isPublic(),
        ne(newsArticles.slug, current.slug),
        sameTeams
          ? or(
              eq(newsArticles.category, current.category),
              arrayOverlaps(
                newsArticles.relatedTeamCodes,
                current.relatedTeamCodes,
              ),
            )
          : eq(newsArticles.category, current.category),
      ),
    )
    .orderBy(desc(newsArticles.publishedAt))
    .limit(limit);

  if (primary.length >= limit) {
    return primary.map((r) => ({ ...r, publishedAt: r.publishedAt! }));
  }

  // Completar con las más recientes que no estén ya incluidas.
  const seen = new Set(primary.map((r) => r.id));
  const seenIds = primary.map((r) => r.id);
  const fillerNeeded = limit - primary.length;
  const filler = await db
    .select(baseSelect)
    .from(newsArticles)
    .where(
      and(
        isPublic(),
        ne(newsArticles.slug, current.slug),
        seenIds.length > 0
          ? sql`${newsArticles.id} <> ALL(${seenIds})`
          : sql`true`,
      ),
    )
    .orderBy(desc(newsArticles.publishedAt))
    .limit(fillerNeeded);

  const combined = [...primary, ...filler.filter((f) => !seen.has(f.id))];
  return combined
    .slice(0, limit)
    .map((r) => ({ ...r, publishedAt: r.publishedAt! }));
}

export async function getNewsForTeam(teamCode: string, limit = 3) {
  return listPublishedNews({ teamCode, limit });
}

export async function getNewsForMatch(matchId: number, limit = 3) {
  return listPublishedNews({ matchId, limit });
}

/** Slugs publicados — alimenta sitemap y news-sitemap. */
export async function listPublishedSlugsForSitemap() {
  return db
    .select({
      slug: newsArticles.slug,
      title: newsArticles.title,
      publishedAt: newsArticles.publishedAt,
      updatedAt: newsArticles.updatedAt,
      coverUrl: newsArticles.coverUrl,
      tags: newsArticles.tags,
    })
    .from(newsArticles)
    .where(isPublic())
    .orderBy(desc(newsArticles.publishedAt));
}

/** Incremento atómico del contador de vistas. Idempotente por petición. */
export async function bumpViewCount(slug: string) {
  await db
    .update(newsArticles)
    .set({ viewCount: sql`${newsArticles.viewCount} + 1` })
    .where(and(isPublic(), eq(newsArticles.slug, slug)));
}
