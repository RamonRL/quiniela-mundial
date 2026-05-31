import { listPublishedSlugsForSitemap } from "@/lib/news/queries";

/**
 * Sitemap específico para Google News. Usa el namespace
 * `xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"` y limita
 * el output a artículos de las últimas 48 horas — Google News
 * deliberadamente ignora todo lo más antiguo en este sitemap (los
 * artículos viejos siguen indexados vía el sitemap general).
 *
 * Sin esto, los artículos pueden tardar horas-días en aparecer en
 * "Top stories"; con esto, Googlebot-News los detecta en su próximo
 * crawl (suele ser <15 min para sitios establecidos).
 */
export const revalidate = 300;
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://quinielamundial.es";

const TWO_DAYS_MS = 1000 * 60 * 60 * 48;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const all = await listPublishedSlugsForSitemap();
  const cutoff = Date.now() - TWO_DAYS_MS;
  const published = all.filter((a) => a.publishedAt != null);
  let fresh = published.filter((a) => a.publishedAt!.getTime() >= cutoff);

  // Google rechaza un news-sitemap con <urlset> vacío ("Falta la etiqueta
  // XML obligatoria · Etiqueta: url" en Search Console). Si no hay nada
  // publicado en las últimas 48 h pero hay artículos antiguos, caemos al
  // top-N más reciente para que el sitemap siempre lleve al menos un
  // <url>. Google News los ignora para "Top stories" por estar fuera de
  // ventana, pero el sitemap pasa la validación y no se marca como roto.
  if (fresh.length === 0 && published.length > 0) {
    fresh = published
      .sort((a, b) => b.publishedAt!.getTime() - a.publishedAt!.getTime())
      .slice(0, 3);
  }

  // Sin ningún artículo publicado en BD: devolvemos 404 en lugar de un
  // sitemap vacío — no tiene sentido anunciar a Google News una sección
  // que aún no existe.
  if (fresh.length === 0) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  }

  const entries = fresh
    .map((a) => {
      const url = `${SITE_URL}/noticias/${a.slug}`;
      const pubDate = a.publishedAt!.toISOString();
      const keywords = a.tags.length > 0 ? escapeXml(a.tags.join(", ")) : "";
      return [
        "  <url>",
        `    <loc>${escapeXml(url)}</loc>`,
        `    <lastmod>${a.updatedAt.toISOString()}</lastmod>`,
        "    <news:news>",
        "      <news:publication>",
        "        <news:name>Quiniela Mundial</news:name>",
        "        <news:language>es</news:language>",
        "      </news:publication>",
        `      <news:publication_date>${pubDate}</news:publication_date>`,
        `      <news:title>${escapeXml(a.title)}</news:title>`,
        keywords ? `      <news:keywords>${keywords}</news:keywords>` : "",
        "    </news:news>",
        a.coverUrl
          ? `    <image:image><image:loc>${escapeXml(a.coverUrl)}</image:loc></image:image>`
          : "",
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    entries,
    "</urlset>",
  ].join("\n");

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
