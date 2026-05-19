import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://quinielamundial.es";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Permitimos todo lo que es contenido público (landing, calendario,
        // grupos, goleadores, bracket, equipos, partidos, sedes) y bloqueamos
        // las zonas autenticadas / dependientes de sesión, que tras el login
        // generan vistas personalizadas que no tiene sentido indexar.
        allow: ["/"],
        disallow: [
          "/admin",
          "/api",
          "/auth",
          "/invite",
          "/dashboard",
          "/predicciones",
          "/perfil",
          "/chat",
          "/mi-quiniela",
          "/ranking",
          "/comparar",
          "/estadisticas",
          "/onboarding",
          "/logout",
        ],
      },
    ],
    sitemap: [
      `${siteUrl}/sitemap.xml`,
      // Sitemap separado para Google News — solo lo lee Googlebot-News y
      // contiene únicamente los artículos de las últimas 48 horas.
      `${siteUrl}/news-sitemap.xml`,
    ],
    host: siteUrl,
  };
}
