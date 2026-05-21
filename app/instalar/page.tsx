import type { Metadata } from "next";
import Link from "next/link";
import { InstallExperience } from "@/components/install/install-experience";

/**
 * Landing pública del QR del tutorial → flujo de instalación PWA.
 *
 * Sin shell (no hereda layout de `(app)` ni de `(public)` porque vive
 * directamente bajo `app/`), sin auth: cualquiera que escanee el QR
 * aterriza aquí. Toda la heurística por plataforma vive en
 * `<InstallExperience />` (client) — esta página solo renderiza el
 * marco y aporta metadata.
 */
export const metadata: Metadata = {
  title: "Instalar la app",
  description: "Instala Quiniela Mundial en tu móvil — sin AppStore ni Google Play, en dos toques.",
  robots: {
    // No-index: es una landing de utilidad, no contenido SEO.
    index: false,
    follow: true,
  },
  alternates: { canonical: "/instalar" },
};

export default function InstalarPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--color-bg)]">
      {/* Halftone arena de fondo — mismo lenguaje visual que el
          dashboard, sin distraer del CTA central. */}
      <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" />
      <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-display text-lg tracking-tight text-[var(--color-foreground)]"
          >
            <span aria-hidden className="text-[var(--color-arena)]">●</span>
            Quiniela Mundial
          </Link>
          <Link
            href="/"
            className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
          >
            Saltar →
          </Link>
        </header>

        <InstallExperience />
      </main>
    </div>
  );
}
