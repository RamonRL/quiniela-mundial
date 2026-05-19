import type { Metadata, Viewport } from "next";
import {
  Big_Shoulders,
  DM_Sans,
  JetBrains_Mono,
  Mona_Sans,
} from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/shell/navigation-progress";
import { OrganizationLD, WebApplicationLD } from "@/components/seo/jsonld";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const bigShoulders = Big_Shoulders({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700", "800", "900"],
  variable: "--font-display-loaded",
  display: "swap",
});

// Mona Sans: la grotesque variable de GitHub. Ejes wght + wdth y un
// dibujo geométrico con terminaciones bien resueltas dan un cuerpo
// moderno con personalidad técnica. Cargamos el peso 800 además del
// 700 para tener un ExtraBold que dé contraste real en los `<strong>`
// del cuerpo de las noticias frente al regular 400.
const monaSans = Mona_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-editorial-loaded",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-loaded",
  display: "swap",
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Quiniela Mundial";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quinielamundial.es";

// Title template usa "%s · Quiniela Mundial 2026" → cada página declara su
// propio metadata.title corto ("Calendario") y se concatena. La default
// (cuando una page no declara title) está cargada de keywords objetivo.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Quiniela Mundial 2026 · Predicciones, calendario y resultados",
    template: "%s · Quiniela Mundial 2026",
  },
  description:
    "Quiniela del Mundial 2026 entre amigos. Calendario completo, grupos, bracket FIFA, goleadores y predicciones colaborativas. España · gratis.",
  applicationName: appName,
  keywords: [
    "Mundial 2026",
    "Copa Mundial 2026",
    "FIFA World Cup 2026",
    "quiniela",
    "quiniela mundial",
    "quiniela mundial 2026",
    "quiniela amigos",
    "predicciones mundial",
    "calendario mundial 2026",
    "grupos mundial 2026",
    "bracket mundial",
  ],
  authors: [{ name: "Quiniela Mundial" }],
  creator: "Quiniela Mundial",
  publisher: "Quiniela Mundial",
  formatDetection: { telephone: false, email: false, address: false },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [
        { url: "/feed.xml", title: "Quiniela Mundial · RSS" },
      ],
    },
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "Quiniela Mundial",
    title: "Quiniela Mundial 2026 · Predicciones, calendario y resultados",
    description:
      "Quiniela del Mundial 2026 entre amigos. Calendario, grupos, bracket FIFA, goleadores y predicciones colaborativas.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quiniela Mundial 2026",
    description:
      "Predicciones del Mundial 2026 entre amigos. Calendario, grupos, bracket y goleadores.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Verification placeholders. Rellenar tras añadir property en cada
  // herramienta y elegir verificación por meta tag (alternativa: TXT DNS).
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION ?? "",
    },
  },
  // ─── PWA (iOS + Android) ──────────────────────────────────────────
  // appleWebApp = meta tags apple-mobile-web-app-* que hacen que Safari
  // abra la app en modo standalone (sin barra de navegación) al
  // lanzarla desde el icono del Home Screen.
  appleWebApp: {
    capable: true,
    title: appName,
    statusBarStyle: "default",
  },
  manifest: "/manifest.webmanifest",
};

// Sin `maximumScale: 1` ni `userScalable: false`: Lighthouse / mobile-first
// indexing penaliza cualquier setting que bloquee zoom (a11y). El coste UX
// es asumible — el usuario puede pinch-zoomar accidentalmente, pero gana SEO
// score y es mejor para personas con baja visión.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1014" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      translate="no"
      suppressHydrationWarning
      className={`${dmSans.variable} ${bigShoulders.variable} ${monaSans.variable} ${jetbrains.variable}`}
    >
      <body>
        <ThemeProvider>
          <NavigationProgress />
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
        <OrganizationLD />
        <WebApplicationLD />
      </body>
    </html>
  );
}
