import { brandedOg, fallbackOg } from "@/lib/og-assets";
import { renderCronicaCover } from "@/lib/og/cronica-cover";
import { loadCronicaCoverData } from "@/lib/og/cronica-cover-data";
import { getNewsBySlug } from "@/lib/news/queries";
import { NEWS_CATEGORIES } from "@/lib/news/categories";

// OG dinámico de cada noticia. Única fuente de `og:image` (la metadata de
// page.tsx ya NO declara images, para no duplicar tags). Prioridad:
//   1. Crónica (relatedMatchId) → marcador broadcast en vivo desde la BD.
//   2. Artículo con portada propia (convocatorias…) → servimos esa imagen.
//   3. Fallback de marca.
export const runtime = "nodejs";
export const alt = "Quiniela Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function NewsOpenGraph({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const article = await getNewsBySlug(slug);
    if (!article) return await fallbackOg();

    // 1. Crónica con partido → marcador (mismo render que el cover).
    if (article.relatedMatchId != null) {
      const data = await loadCronicaCoverData({ matchId: article.relatedMatchId });
      if (data) return await renderCronicaCover(data);
    }

    // 2. Artículo con portada propia → reproducimos esa imagen tal cual.
    if (article.coverUrl) {
      const res = await fetch(article.coverUrl, {
        next: { revalidate: 60 * 60 * 24 },
      });
      if (res.ok) {
        return new Response(await res.arrayBuffer(), {
          headers: {
            "Content-Type": res.headers.get("content-type") ?? "image/png",
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      }
    }

    // 3. Fallback de marca con eyebrow de categoría.
    const cat = NEWS_CATEGORIES[article.category];
    return await brandedOg({
      eyebrow: `Mundial 2026 · ${cat?.label ?? "Noticias"}`,
      title: [article.title.length > 42 ? `${article.title.slice(0, 40)}…` : article.title],
    });
  } catch (err) {
    console.error("[og:noticia] render failed", err);
    return await fallbackOg();
  }
}
