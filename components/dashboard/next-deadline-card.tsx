"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Flame } from "lucide-react";
import { useEffect, useState } from "react";

export function NextDeadlineCard({
  label,
  href,
  closesAt,
  missing,
  total,
  eyebrow,
  ctaText,
}: {
  label: string;
  href: string;
  /** ISO string of when the deadline closes. */
  closesAt: string;
  /** Items still pending to be predicted. */
  missing: number;
  total: number;
  eyebrow?: string;
  ctaText?: string;
}) {
  const t = useTranslations("progressHub");
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const closes = new Date(closesAt).getTime();
  const ms = Math.max(0, closes - now);
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const urgent = ms < 60 * 60 * 1000;
  const veryUrgent = ms < 10 * 60 * 1000;
  const closed = ms <= 0;

  const blocks: Array<{ value: string; unit: string }> = (() => {
    if (closed) {
      return [
        { value: "00", unit: t("ndClosed") },
      ];
    }
    if (days > 0) {
      return [
        { value: days.toString().padStart(2, "0"), unit: days === 1 ? t("ndDay") : t("ndDays") },
        { value: hours.toString().padStart(2, "0"), unit: t("ndHours") },
        { value: minutes.toString().padStart(2, "0"), unit: t("ndMin") },
      ];
    }
    return [
      { value: hours.toString().padStart(2, "0"), unit: t("ndHours") },
      { value: minutes.toString().padStart(2, "0"), unit: t("ndMin") },
      { value: seconds.toString().padStart(2, "0"), unit: t("ndSec") },
    ];
  })();

  const accent = closed
    ? "border-[var(--color-border)] bg-[var(--color-surface-2)]"
    : veryUrgent
      ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_18%,var(--color-surface))] shadow-[var(--shadow-arena)]"
      : urgent
        ? "border-[var(--color-arena)]/70 bg-[color-mix(in_oklch,var(--color-arena)_12%,var(--color-surface))]"
        : "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))]";

  const headColor = closed
    ? "text-[var(--color-muted-foreground)]"
    : "text-[var(--color-arena)]";

  return (
    <Link
      href={href}
      className={`group relative grid gap-6 overflow-hidden rounded-2xl border p-6 transition hover:-translate-y-0.5 sm:p-8 lg:grid-cols-[auto_1fr_auto] lg:items-center ${accent}`}
    >
      {/* halftone + spotlight ambient */}
      <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,color-mix(in_oklch,var(--color-arena)_14%,transparent),transparent_60%)]"
      />

      {/* Countdown block */}
      <div className="relative flex items-end gap-3 sm:gap-5">
        <Flame
          className={`mb-2 size-8 shrink-0 ${headColor} ${
            veryUrgent ? "animate-pulse" : ""
          }`}
        />
        <div className="flex items-end gap-3 sm:gap-4">
          {blocks.map((b, i) => (
            <div key={`${i}-${b.unit}`} className="flex flex-col items-start leading-none">
              <span
                className={`font-display tabular text-5xl tracking-tighter sm:text-6xl ${
                  closed ? "text-[var(--color-muted-foreground)]" : "text-[var(--color-arena)] glow-arena"
                }`}
              >
                {b.value}
              </span>
              <span className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                {b.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Label + missing */}
      <div className="relative space-y-1.5">
        <p className={`font-mono text-[0.6rem] uppercase tracking-[0.32em] ${headColor}`}>
          {eyebrow ?? (closed ? t("ndClosedEyebrow") : t("ndNextDeadline"))}
        </p>
        <p className="font-display text-2xl leading-none tracking-tight sm:text-3xl">
          {label}
        </p>
        {!closed && total > 0 ? (
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {missing > 0
              ? t("ndPicksPending", { missing, total })
              : t("ndAllCovered")}
          </p>
        ) : null}
      </div>

      {/* CTA */}
      <div className="relative flex shrink-0 items-center gap-2 self-end justify-self-end font-mono text-xs uppercase tracking-[0.28em] text-[var(--color-arena)]">
        {ctaText ?? (missing > 0 ? t("ndComplete") : t("review"))}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
