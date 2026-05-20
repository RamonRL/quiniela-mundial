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
  // Tratamos "/" como público: la landing decide si redirigir a /dashboard
  // (sesión activa) o renderizar la landing SEO (sin sesión).
  const isPublic =
    pathname === "/" ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Skip getUser() para rutas públicas: ahorra un round-trip a Supabase
  // en cada navegación (Chrome refetcha manifest.webmanifest a menudo;
  // si pasaba por el middleware completo, era un cuello de botella).
  if (isPublic) {
    return response;
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

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
