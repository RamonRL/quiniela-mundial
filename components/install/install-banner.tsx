"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, X } from "lucide-react";

const STORAGE_KEY = "qm:install-banner-dismissed";

/**
 * Banner promo de instalación de la PWA, encima de la card principal del
 * dashboard. La mascota invita a instalar la app y todo el banner lleva a
 * /instalar. Aparece a todo el mundo, pero al cerrarlo se guarda en
 * localStorage y no vuelve a salir. Tampoco se muestra si ya estás dentro de
 * la app instalada (display-mode: standalone). Arranca oculto para evitar
 * flash: se decide en el efecto, ya con localStorage disponible.
 */
export function InstallBanner() {
  const t = useTranslations("installBanner");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setVisible(!dismissed && !standalone);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* storage no disponible → solo ocultamos esta sesión */
    }
    setVisible(false);
  };

  return (
    <div className="rise-in relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] shadow-[var(--shadow-arena)]">
      <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.05]" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,color-mix(in_oklch,var(--color-arena)_16%,transparent),transparent_60%)]"
      />
      <Link
        href="/instalar"
        aria-label={t("title")}
        className="group relative flex items-center gap-3 py-2.5 pl-3 pr-12 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-arena)] sm:gap-4 sm:py-3"
      >
        <Image
          src="/mascota.png"
          alt=""
          width={1024}
          height={1536}
          priority={false}
          className="h-14 w-auto shrink-0 self-end drop-shadow-[0_2px_8px_color-mix(in_oklch,var(--color-arena)_40%,transparent)] sm:h-16"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight tracking-tight sm:text-xl">
            {t("title")}
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--color-arena)] sm:text-xs">
            {t("subtitle")}
            <ArrowRight className="size-3.5 shrink-0 transition group-hover:translate-x-0.5" />
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full text-[var(--color-muted-foreground)] transition hover:bg-[color-mix(in_oklch,var(--color-arena)_14%,transparent)] hover:text-[var(--color-foreground)]"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
