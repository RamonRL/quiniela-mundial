"use client";

import { useActionState, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Check, Loader2, Moon, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { updateTimezone, type SettingsFormState } from "./actions";

const INITIAL_STATE: SettingsFormState = { ok: false };

/**
 * Zona horaria preseleccionable en la UI. La lista es curada (mercados
 * principales hispanohablantes + USA + Brasil); si el TZ del navegador no
 * está aquí, el botón "Detectar automáticamente" lo carga igualmente y se
 * guarda — el `<select>` aceptará cualquier IANA al hacer un add dinámico.
 */
const TZ_OPTIONS: { value: string; label: string }[] = [
  { value: "Europe/Madrid", label: "España peninsular (Europe/Madrid)" },
  { value: "Atlantic/Canary", label: "Canarias (Atlantic/Canary)" },
  { value: "America/Mexico_City", label: "México (America/Mexico_City)" },
  { value: "America/Guatemala", label: "Guatemala (America/Guatemala)" },
  { value: "America/Costa_Rica", label: "Costa Rica (America/Costa_Rica)" },
  { value: "America/Panama", label: "Panamá (America/Panama)" },
  { value: "America/Bogota", label: "Colombia (America/Bogota)" },
  { value: "America/Caracas", label: "Venezuela (America/Caracas)" },
  { value: "America/Lima", label: "Perú (America/Lima)" },
  { value: "America/Santiago", label: "Chile (America/Santiago)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (America/Argentina/Buenos_Aires)" },
  { value: "America/Sao_Paulo", label: "Brasil (America/Sao_Paulo)" },
  { value: "America/New_York", label: "EE. UU. Este (America/New_York)" },
  { value: "America/Chicago", label: "EE. UU. Central (America/Chicago)" },
  { value: "America/Denver", label: "EE. UU. Montaña (America/Denver)" },
  { value: "America/Los_Angeles", label: "EE. UU. Oeste (America/Los_Angeles)" },
];

const AUTO_VALUE = "auto";

export function SettingsForm({ currentTimezone }: { currentTimezone: string | null }) {
  const t = useTranslations("settings");
  const [state, action, pending] = useActionState(updateTimezone, INITIAL_STATE);
  const [tz, setTz] = useState<string>(currentTimezone ?? AUTO_VALUE);

  // Si el TZ guardado no está en la lista curada, lo añadimos dinámicamente
  // para que aparezca seleccionado en el select sin sorpresa.
  const allOptions = (() => {
    if (!currentTimezone || TZ_OPTIONS.some((o) => o.value === currentTimezone)) {
      return TZ_OPTIONS;
    }
    return [...TZ_OPTIONS, { value: currentTimezone, label: currentTimezone }];
  })();

  const onAutoDetect = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTz(detected);
    } catch {
      // Algunos clientes muy raros (Lynx, etc.) no devuelven nada — no-op.
    }
  };

  return (
    <div className="space-y-4">
      {/* Orden: Idioma → Tema → Hora local de partidos. */}
      <LanguageSection />
      <ThemeSection />
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <header className="space-y-1 pb-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("tzEyebrow")}
          </p>
          <h2 className="font-display text-xl tracking-tight">{t("tzTitle")}</h2>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("tzDesc")}
          </p>
        </header>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="timezone-select" className="text-xs">
              {t("tzLabel")}
            </Label>
            <input type="hidden" name="timezone" value={tz === AUTO_VALUE ? "" : tz} />
            <Select value={tz} onValueChange={setTz}>
              <SelectTrigger id="timezone-select" className="w-full">
                <SelectValue placeholder={t("tzPlaceholder")} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={AUTO_VALUE}>
                  {t("tzAuto")}
                </SelectItem>
                {allOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAutoDetect}
              disabled={pending}
            >
              <Sparkles className="size-3.5" />
              {t("tzDetect")}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              {t("tzSave")}
            </Button>
          </div>

          {state.ok && state.message ? (
            <p className="text-xs text-[var(--color-success)]">{state.message}</p>
          ) : null}
          {state.error ? (
            <p className="text-xs text-[var(--color-danger)]">{state.error}</p>
          ) : null}
        </form>
      </section>
    </div>
  );
}

// ──────────────────────── Idioma ────────────────────────

function LanguageSection() {
  const t = useTranslations("settings");
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <header className="space-y-1 pb-4">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {t("langEyebrow")}
        </p>
        <h2 className="font-display text-xl tracking-tight">{t("langTitle")}</h2>
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          {t("langDesc")}
        </p>
      </header>
      <LanguageSwitcher />
    </section>
  );
}

// ──────────────────────── Tema ────────────────────────

function ThemeSection() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // next-themes solo conoce el tema activo después del mount (hydration).
  // Antes de eso renderizamos sin marca de "activo" para evitar mismatch
  // de SSR.
  useEffect(() => setMounted(true), []);
  const active = mounted ? theme : null;

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <header className="space-y-1 pb-4">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {t("themeEyebrow")}
        </p>
        <h2 className="font-display text-xl tracking-tight">{t("themeTitle")}</h2>
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          {t("themeDesc")}
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        <ThemeButton
          active={active === "dark"}
          onClick={() => setTheme("dark")}
          icon={<Moon className="size-4" />}
          label={t("themeDark")}
          description={t("themeDarkDesc")}
        />
        <ThemeButton
          active={active === "light"}
          onClick={() => setTheme("light")}
          icon={<Sun className="size-4" />}
          label={t("themeLight")}
          description={t("themeLightDesc")}
        />
      </div>
    </section>
  );
}

function ThemeButton({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-left transition",
        active
          ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface-2))] shadow-[var(--shadow-arena)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-arena)]/40",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md border",
          active
            ? "border-[var(--color-arena)] bg-[var(--color-arena)] text-white"
            : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]",
        )}
      >
        {icon}
      </span>
      <div className="space-y-0.5">
        <p className="font-display text-base tracking-tight">{label}</p>
        <p className="text-xs leading-snug text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>
    </button>
  );
}
