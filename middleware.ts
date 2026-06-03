import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

/**
 * Rutas que NO se localizan: route handlers (api, callback OAuth, tunnel de
 * Sentry), feeds/metadata y cualquier fichero con extensión. Para ellas
 * saltamos next-intl y dejamos solo la gestión de sesión (son públicas o
 * validan auth por dentro).
 */
function bypassI18n(pathname: string): boolean {
  if (/^\/(api|auth\/callback|monitoring)(\/|$)/.test(pathname)) return true;
  if (
    /^\/(sitemap\.xml|robots\.txt|feed\.xml|news-sitemap\.xml|opengraph-image|twitter-image|icon|apple-icon|manifest\.webmanifest)(\/|$)/.test(
      pathname,
    )
  )
    return true;
  // Cualquier ruta con extensión de fichero (.png, .xml, .txt, …).
  if (/\/[^/]+\.[^/]+$/.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (bypassI18n(pathname)) {
    return updateSession(request);
  }

  // 1) next-intl resuelve el locale (rewrite interno a /[locale]/… o, para
  //    el locale por defecto, sirve la ruta sin prefijo).
  const response = handleI18nRouting(request);

  // 2) Si next-intl decide redirigir (normalización de locale), respétalo.
  if (response.headers.get("location")) {
    return response;
  }

  // 3) Gestión de sesión Supabase sobre la response de next-intl (conserva
  //    el rewrite + escribe cookies refrescadas).
  return updateSession(request, response);
}

export const config = {
  matcher: [
    /*
     * Run on all routes except:
     * - _next static & images
     * - public files (svg, png, jpg, jpeg, gif, webp, avif, ico, webmanifest)
     * - manifest.webmanifest (PWA — debe ser pública sin auth round-trip)
     * - api routes (we keep them stateless; auth checks run inside)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|webmanifest)$).*)",
  ],
};
