"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, Swords, Target, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TutorialMascot } from "@/components/tutorial/mascot";

/**
 * Banner de "fase eliminatoria abierta" para el dashboard (sustituye al de
 * redes mientras dure la ronda). Dos variantes:
 *
 *  - `completo`: la liga predice el BRACKET, que se cierra al arrancar el primer
 *    dieciseisavos → urgencia con cuenta atrás a `closesAtISO`. Menciona que
 *    además ya pueden predecir resultados y goleadores de R32.
 *  - `basic`: ligas sin bracket (Marcador / Solo ganador) → solo el aviso de que
 *    ya pueden predecir los dieciseisavos (cada partido cierra a su hora).
 *
 * Mantiene la estética del banner de redes (estadio: spotlight + halftone +
 * acento arena + mascota). La cuenta atrás es cliente (tictac cada segundo).
 */
export function KnockoutBanner({
  variant,
  closesAtISO,
  bracketDone = false,
}: {
  variant: "completo" | "basic" | "repesca";
  closesAtISO?: string | null;
  bracketDone?: boolean;
}) {
  const t = useTranslations("dashboard");
  // "completo" y "repesca" comparten estética de urgencia + cuenta atrás.
  const urgent = variant !== "basic";
  const eyebrow =
    variant === "repesca"
      ? t("koEyebrowRepesca")
      : variant === "completo"
        ? t("koEyebrowCompleto")
        : t("koEyebrowBasic");
  const title =
    variant === "repesca"
      ? t("koTitleRepesca")
      : variant === "completo"
        ? t("koTitleCompleto")
        : t("koTitleBasic");
  const body =
    variant === "repesca"
      ? t("koBodyRepesca")
      : variant === "completo"
        ? t("koBodyCompleto")
        : t("koBodyBasic");

  return (
    <section
      aria-label={eyebrow}
      className={`rise-in relative overflow-hidden rounded-2xl border bg-[var(--color-surface)] ${
        urgent
          ? "border-[var(--color-arena)]/55 live-glow"
          : "border-[var(--color-border)] shadow-[var(--shadow-elev-1)]"
      }`}
    >
      <span aria-hidden className={`spotlight pointer-events-none absolute inset-0 ${urgent ? "opacity-100" : "opacity-50"}`} />
      <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-arena)]/50 to-transparent"
      />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        {/* Mascota + mensaje */}
        <div className="flex items-start gap-4">
          <TutorialMascot />
          <div className="min-w-0 space-y-1.5">
            <p className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-arena)]">
              <Swords className="size-3.5" />
              {eyebrow}
            </p>
            <h2 className="font-display text-2xl leading-none tracking-tight sm:text-3xl">
              {title}
            </h2>
            <p className="max-w-xl text-sm text-[var(--color-muted-foreground)]">
              {body}
            </p>
            {urgent && closesAtISO ? <Countdown targetISO={closesAtISO} label={t("koCountdownLabel")} /> : null}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          {variant !== "basic" ? (
            <Link
              href="/predicciones/bracket"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
            >
              <Swords className="size-4" />
              {bracketDone ? t("koCtaBracketDone") : t("koCtaBracket")}
              <ArrowRight className="size-3.5" />
            </Link>
          ) : null}
          {variant !== "repesca" ? (
            <Link
              href="/predicciones"
              className={
                variant === "basic"
                  ? "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
                  : "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-4 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-foreground)] transition hover:border-[var(--color-arena)]/50"
              }
            >
              <Target className="size-4" />
              {t("koCtaResults")}
              {variant === "basic" ? <ArrowRight className="size-3.5" /> : null}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Cuenta atrás en vivo (tictac cada segundo) hasta `targetISO`. */
function Countdown({ targetISO, label }: { targetISO: string; label: string }) {
  const target = new Date(targetISO).getTime();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const totalSecs = remaining != null ? Math.max(0, Math.floor(remaining / 1000)) : null;
  const d = totalSecs != null ? Math.floor(totalSecs / 86400) : null;
  const h = totalSecs != null ? Math.floor((totalSecs % 86400) / 3600) : null;
  const m = totalSecs != null ? Math.floor((totalSecs % 3600) / 60) : null;
  const s = totalSecs != null ? totalSecs % 60 : null;
  const pad = (n: number | null) => (n == null ? "--" : n.toString().padStart(2, "0"));

  return (
    <p className="flex items-center gap-2 pt-0.5">
      <Clock className="size-3.5 text-[var(--color-arena)]" />
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <span className="font-display tabular text-lg leading-none tracking-tight text-[var(--color-arena)] glow-arena">
        {d != null && d > 0 ? `${d}d ` : ""}
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </p>
  );
}
