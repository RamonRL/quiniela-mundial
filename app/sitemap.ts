import type { MetadataRoute } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, matches, teams } from "@/lib/db/schema";
import { VENUES } from "@/lib/seo/venues";
import { listPublishedSlugsForSitemap } from "@/lib/news/queries";
import { NEWS_CATEGORY_KEYS } from "@/lib/news/categories";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://quinielamundial.es";

// Cambiamos la frecuencia según fecha — durante el torneo la app vive,
// fuera de él los datos son estáticos.
const KICKOFF = new Date("2026-06-11T00:00:00Z");
const FINAL = new Date("2026-07-19T23:59:59Z");

function changeFreq(): "daily" | "weekly" | "monthly" {
  const now = Date.now();
  if (now >= KICKOFF.getTime() && now <= FINAL.getTime()) return "daily";
  if (now >= KICKOFF.getTime() - 1000 * 60 * 60 * 24 * 30) return "weekly";
  return "monthly";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const freq = changeFreq();

  const [groupRows, teamRows, matchRows, newsRows] = await Promise.all([
    db.select({ code: groups.code }).from(groups).orderBy(asc(groups.code)),
    db.select({ code: teams.code }).from(teams).orderBy(asc(teams.code)),
    db.select({ id: matches.id, scheduledAt: matches.scheduledAt }).from(matches),
    listPublishedSlugsForSitemap(),
  ]);

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: freq, priority: 1.0 },
    { url: `${siteUrl}/calendario`, lastModified: now, changeFrequency: freq, priority: 0.9 },
    { url: `${siteUrl}/noticias`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/grupos`, lastModified: now, changeFrequency: freq, priority: 0.9 },
    { url: `${siteUrl}/goleadores`, lastModified: now, changeFrequency: freq, priority: 0.8 },
    { url: `${siteUrl}/bracket`, lastModified: now, changeFrequency: freq, priority: 0.9 },
    { url: `${siteUrl}/equipos`, lastModified: now, changeFrequency: freq, priority: 0.8 },
    { url: `${siteUrl}/sedes`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/contacto`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/precios`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/puntuacion`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/aviso-legal`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const groupUrls: MetadataRoute.Sitemap = groupRows.map((g) => ({
    url: `${siteUrl}/grupos/${g.code}`,
    lastModified: now,
    changeFrequency: freq,
    priority: 0.7,
  }));

  const teamUrls: MetadataRoute.Sitemap = teamRows.map((t) => ({
    url: `${siteUrl}/equipos/${t.code}`,
    lastModified: now,
    changeFrequency: freq,
    priority: 0.7,
  }));

  const venueUrls: MetadataRoute.Sitemap = VENUES.map((v) => ({
    url: `${siteUrl}/sedes/${v.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const matchUrls: MetadataRoute.Sitemap = matchRows.map((m) => ({
    url: `${siteUrl}/partido/${m.id}`,
    // Si el partido ya pasó usamos su scheduledAt; si está por jugarse
    // mantenemos `now` para que Google nos crawlee de nuevo cuando llegue.
    lastModified: m.scheduledAt < now ? m.scheduledAt : now,
    changeFrequency: freq,
    priority: 0.6,
  }));

  // Landings de categoría — siete entradas estáticas con URL `/noticias/categoria/<key>`.
  const newsCategoryUrls: MetadataRoute.Sitemap = NEWS_CATEGORY_KEYS.map((k) => ({
    url: `${siteUrl}/noticias/categoria/${k}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Artículos publicados. Si tiene <7 días, marcamos `hourly` para que
  // Google revisite y actualice "Top stories"; si es más viejo, weekly.
  const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;
  const newsArticleUrls: MetadataRoute.Sitemap = newsRows
    .filter((a) => a.publishedAt != null)
    .map((a) => {
      const isFresh = a.publishedAt!.getTime() > Date.now() - SEVEN_DAYS_MS;
      return {
        url: `${siteUrl}/noticias/${a.slug}`,
        lastModified: a.updatedAt,
        changeFrequency: isFresh ? ("hourly" as const) : ("weekly" as const),
        priority: isFresh ? 0.8 : 0.6,
      };
    });

  return [
    ...staticUrls,
    ...groupUrls,
    ...teamUrls,
    ...venueUrls,
    ...matchUrls,
    ...newsCategoryUrls,
    ...newsArticleUrls,
  ];
}
