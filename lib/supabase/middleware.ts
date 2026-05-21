import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

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

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  // Rutas públicas estrictas: nunca hace falta validar sesión en ellas.
  // `/` NO está aquí porque queremos un comportamiento especial: a
  // visitantes anónimos les servimos la landing, pero a usuarios
  // autenticados les redirigimos a /dashboard. Ese desvío vive ahora
  // aquí (antes lo hacía la propia página) para que /app/(public)/page.tsx
  // ya no lea cookies y quede preparado para cache estática.
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
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
    if (pathname === "/") return response;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // En `/`: si la sesión es válida, mandamos a /dashboard. Si la cookie
  // estaba pero ya expiró (user=null), servimos la landing igualmente.
  if (pathname === "/") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
