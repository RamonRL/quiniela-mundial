"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Globe2, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Nombre nativo de cada idioma para el menú.
const LOCALE_LABEL: Record<Locale, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  pt: "Português",
};

/**
 * Selector de idioma. Cambia el locale preservando la ruta actual vía la
 * navegación de next-intl (que respeta el prefijo "as-needed": es sin
 * prefijo, el resto con /en, /fr, /pt). El locale elegido se persiste en la
 * cookie NEXT_LOCALE automáticamente.
 */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        aria-label="Idioma"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] outline-none transition hover:text-[var(--color-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      >
        <Globe2 className="size-4" />
        {locale.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {routing.locales.map((l) => {
          const active = l === locale;
          return (
            <DropdownMenuItem
              key={l}
              onSelect={() => switchTo(l)}
              className={cn("justify-between", active && "font-semibold")}
            >
              {LOCALE_LABEL[l]}
              {active ? <Check className="size-4 text-[var(--color-arena)]" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
