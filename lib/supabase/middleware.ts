import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { routing } from "@/i18n/routing";
import { fetchWithTimeout } from "./fetch";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PREFIXED_LOCALES = routing.locales.filter(
  (l) => l !== routing.defaultLocale,
);

/**
 * Separa el prefijo de locale del pathname. Para el locale por defecto (es,
 * que va SIN prefijo) devuelve el pathname tal cual. Así toda la lógica de
 * rutas públicas/protegidas sigue razonando sobre paths "lógicos" (`/login`,
 * `/dashboard`, …) independientemente del idioma.
 */
function splitLocale(pathname: string): { locale: string; base: string } {
  for (const l of PREFIXED_LOCALES) {
    if (pathname === `/${l}`) return { locale: l, base: "/" };
    if (pathname.startsWith(`/${l}/`))
      return { locale: l, base: pathname.slice(l.length + 1) };
  }
  return { locale: routing.defaultLocale, base: pathname };
}

/** Reconstruye un path con su prefijo de locale (sin prefijo para es). */
function withLocale(locale: string, path: string): string {
  if (locale === routing.defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

// Rutas que NO requieren sesión. Crítico que aquí estén los recursos
// PWA (manifest), la landing del invite link y todo el contenido público
// indexable (landing, calendario, grupos, goleadores, bracket, equipos,
// sedes, partidos individuales, sitemap, robots, og-image). Si una de
// estas pasara por el getUser() del middleware, Googlebot recibiría 307
// → /login y nunca indexaría.
const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/auth/error",
  "/invite",
  // Rutas /api/* — son stateless, validan auth dentro del handler si
  // hace falta (admin actions usan requireAdmin(), etc). El middleware
  // las redirigia a /login cuando no había sesión, lo que rompía
  // cosas como webhooks de Lemon Squeezy: LS recibía 200 con HTML de
  // login y se creía que la entrega iba bien.
  "/api",
  "/manifest.webmanifest",
  // Landing PWA install — al escanear el QR del tutorial cualquiera
  // (logueado o no) debe poder seguir el flow sin pasar por /login.
  "/instalar",
  "/calendario",
  "/grupos",
  "/goleadores",
  "/bracket",
  "/equipos",
  "/sedes",
  "/partido",
  "/noticias",
  "/faq",
  "/contacto",
  "/precios",
  "/puntuacion",
  // Paddle redirige aquí (con ?_ptxn=...) tras crear la transaction. El
  // comprador puede llegar sin sesión activa, así que debe ser pública.
  "/checkout",
  "/aviso-legal",
  "/privacidad",
  "/cookies",
  "/terminos",
  "/minijuegos",
  "/sitemap.xml",
  "/news-sitemap.xml",
  "/feed.xml",
  "/robots.txt",
  "/opengraph-image",
  "/twitter-image",
  "/icon.png",
  "/apple-icon.png",
  "/icon",
  "/apple-icon",
];

export async function updateSession(
  request: NextRequest,
  incoming?: NextResponse,
) {
  // En el flujo compuesto recibimos la `response` del middleware de
  // next-intl (que lleva el rewrite de locale): escribimos las cookies de
  // sesión sobre ELLA en vez de recrearla, para no perder ese rewrite.
  const response = incoming ?? NextResponse.next({ request });

  // Path "lógico" sin prefijo de idioma + el locale detectado (para
  // reconstruir redirects con el prefijo correcto).
  const { locale, base } = splitLocale(request.nextUrl.pathname);

  // Rutas públicas estrictas: nunca hace falta validar sesión en ellas.
  // `/` NO está aquí porque queremos un comportamiento especial: a
  // visitantes anónimos les servimos la landing, pero a usuarios
  // autenticados les redirigimos a /dashboard. Ese desvío vive ahora
  // aquí (antes lo hacía la propia página) para que la home ya no lea
  // cookies y quede preparada para cache estática.
  const isPublic = PUBLIC_PATHS.some(
    (p) => base === p || base.startsWith(`${p}/`),
  );
  if (isPublic) return response;

  // Fast-path por presencia de cookie. Si no hay token de auth (Googlebot,
  // visitantes anónimos, etc), nos saltamos la validación contra Supabase:
  //   - En `/` → seguimos al render de la landing (page-level cacheable).
  //   - En cualquier ruta protegida → redirect directo a /login sin pegar
  //     a Supabase Auth (ahorra ~100ms por request).
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!hasAuthCookie) {
    if (base === "/") return response;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = withLocale(locale, "/login");
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    // Timeout duro: que un GoTrue lento/caído no cuelgue ESTA request (corre
    // en cada navegación protegida). Ver lib/supabase/fetch.ts.
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // No recreamos `response` (perdería el rewrite de next-intl): solo
        // escribimos las cookies de sesión sobre la response existente.
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Validación de sesión contra Auth. Si la llamada se cuelga o falla (GoTrue
  // lento/caído/rate-limit), el fetch con timeout la aborta y FALLAMOS ABIERTO:
  // dejamos pasar la request con las cookies que ya trae en vez de colgarla o
  // echar a /login a un usuario legítimo. El guard de la página (requireUser →
  // getCurrentUser, que también tiene timeout) revalida en el render. Así un
  // hipo de Auth degrada en vez de tumbar la navegación.
  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (err) {
    Sentry.addBreadcrumb({
      category: "auth.middleware",
      level: "warning",
      message: "supabase.auth.getUser() falló/timeout en middleware → fail-open",
    });
    Sentry.captureException(err);
    return response;
  }

  // En `/`: si la sesión es válida, mandamos a /dashboard. Si la cookie
  // estaba pero ya expiró (user=null), servimos la landing igualmente.
  if (base === "/") {
    if (user) {
      return NextResponse.redirect(
        new URL(withLocale(locale, "/dashboard"), request.url),
      );
    }
    return response;
  }

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = withLocale(locale, "/login");
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
