"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Reveal } from "@/components/animation/reveal";
import { useParallax } from "@/components/animation/use-parallax";

/** Bloque "Así se ve la app": 3 móviles con entrada en scale + parallax sutil. */
export function HeroPhones() {
  const t = useTranslations("home");
  const parallax = useParallax<HTMLDivElement>(20);

  return (
    <div className="relative mx-auto mt-12 w-full max-w-4xl sm:mt-16">
      <Reveal variant="fade" delay={60}>
        <div className="flex items-center justify-center gap-3 pb-5">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("hero.phones")}
          </p>
          <span className="h-px w-6 bg-[var(--color-arena)]" />
        </div>
      </Reveal>
      <Reveal variant="scale" delay={120}>
        <div ref={parallax} className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/4 mx-auto h-2/3 w-3/4 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklch, var(--color-arena) 22%, transparent), transparent 70%)",
            }}
          />
          <Image
            src="/app-screens.png"
            alt="Capturas de la app Quiniela Mundial 2026: quiniela pública, cuenta atrás al kickoff y posiciones por grupo en el móvil"
            width={1536}
            height={1024}
            priority
            className="relative mx-auto h-auto w-full max-w-3xl drop-shadow-2xl"
          />
        </div>
      </Reveal>
    </div>
  );
}
