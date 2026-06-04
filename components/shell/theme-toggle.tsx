"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Toggle claro/oscuro del header (solo desktop — en móvil el tema se cambia
 * desde Ajustes, igual que el idioma). Mismo estilo de botón que el toggle de
 * plegado de la sidebar.
 *
 * next-themes solo conoce el tema real tras el mount (hydration): hasta
 * entonces renderizamos asumiendo oscuro (el default de la app) — el DOM
 * inicial servidor/cliente coincide y no hay mismatch.
 */
export function ThemeToggle() {
  const t = useTranslations("shell");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={t("toggleTheme")}
      title={t("toggleTheme")}
      className="grid size-8 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)] transition hover:border-[var(--color-arena)]/40 hover:text-[var(--color-foreground)]"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
