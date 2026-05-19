import { listPublishedNews } from "@/lib/news/queries";
import { NEWS_CATEGORIES } from "@/lib/news/categories";

/**
 * RSS 2.0 feed con los últimos 30 artículos publicados. Sirve como
 * señal anti-spam para Google (los lectores de RSS son un proxy de
 * "esto es un sitio editorial real") y como mecanismo de subscripción
 * para usuarios power.
 *
 * Sin auto-discovery: para que apps tipo Feedly lo encuentren, en
 * <head> añadimos un <link rel="alternate" type="application/rss+xml">.
 */
export const revalidate = 600;
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://quinielamundial.es";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const items = await listPublishedNews({ limit: 30 });

  const xmlItems = items
    .map((a) => {
      const url = `${SITE_URL}/noticias/${a.slug}`;
      const cat = NEWS_CATEGORIES[a.category];
      return [
        "    <item>",
        `      <title>${escapeXml(a.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${a.publishedAt.toUTCString()}</pubDate>`,
        `      <description>${escapeXml(a.excerpt)}</description>`,
        `      <category>${escapeXml(cat.label)}</category>`,
        a.coverUrl
          ? `      <enclosure url="${escapeXml(a.coverUrl)}" type="image/jpeg" />`
          : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>Quiniela Mundial 2026</title>",
    `    <link>${SITE_URL}</link>`,
    "    <description>Convocatorias, previas, crónicas y análisis del Mundial 2026.</description>",
    "    <language>es-ES</language>",
    `    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />`,
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    xmlItems,
    "  </channel>",
    "</rss>",
  ].join("\n");

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
