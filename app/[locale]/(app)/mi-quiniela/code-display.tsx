"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Caja única de "cómo invitar": el código de 4 dígitos (tiles estilo OTP) y,
 * debajo, el invite link — ambos copiables. Es lo más compartible de la
 * pantalla, así que va primero y con protagonismo (accent arena).
 */
export function CodeDisplay({
  code,
  inviteToken,
}: {
  code: string;
  inviteToken: string;
}) {
  const t = useTranslations("myPool");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const digits = code.padStart(4, "0").slice(0, 4).split("");

  function copyCode() {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopiedCode(true);
        toast.success(t("codeCopied"));
        setTimeout(() => setCopiedCode(false), 1500);
      })
      .catch(() => toast.error(t("copyFailed")));
  }

  function copyLink() {
    // Display estable (/invite/token) para no romper hidratación; copiamos la
    // URL absoluta real.
    const url =
      typeof window === "undefined"
        ? `/invite/${inviteToken}`
        : `${window.location.origin}/invite/${inviteToken}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiedLink(true);
        toast.success(t("linkCopied"));
        setTimeout(() => setCopiedLink(false), 1500);
      })
      .catch(() => toast.error(t("copyFailed")));
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] p-6 shadow-[var(--shadow-arena)]">
      <div className="halftone pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />

      {/* ── Código de invitación ── */}
      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
            {t("inviteCode")}
          </p>
          <p className="pt-1 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("inviteCodeHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={copyCode}
          aria-label={t("copyCode")}
          className="group flex items-center gap-2 sm:gap-3"
        >
          <span className="flex gap-1.5 sm:gap-2">
            {digits.map((d, i) => (
              <span
                key={i}
                className="grid size-14 place-items-center rounded-md border border-[var(--color-arena)]/40 bg-[var(--color-bg)] font-display tabular text-4xl tracking-tight text-[var(--color-arena)] shadow-inner glow-arena transition-transform group-hover:-translate-y-0.5 sm:size-16 sm:text-5xl"
              >
                {d}
              </span>
            ))}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            tabIndex={-1}
            className="pointer-events-none border-[var(--color-arena)]/40"
            aria-hidden
          >
            {copiedCode ? (
              <Check className="size-4 text-[var(--color-success)]" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </button>
      </div>

      {/* ── Separador ── */}
      <div className="relative my-5 border-t border-[var(--color-arena)]/20" aria-hidden />

      {/* ── Invite link ── */}
      <div className="relative space-y-2">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
          {t("inviteLink")}
        </p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md border border-[var(--color-arena)]/30 bg-[var(--color-bg)] px-3 py-2 font-mono text-[0.72rem] text-[var(--color-foreground)]">
            /invite/{inviteToken}
          </code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copyLink}
            aria-label={t("copyLink")}
            className="shrink-0 border-[var(--color-arena)]/40"
          >
            {copiedLink ? (
              <Check className="size-4 text-[var(--color-success)]" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
