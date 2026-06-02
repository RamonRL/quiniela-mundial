"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Hero del código de 4 dígitos. Se renderiza como cuatro tiles separadas
 * estilo OTP, en tamaño grande y con el accent arena: es lo más copiable
 * y compartible de toda la pantalla, así que merece protagonismo.
 */
export function CodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const digits = code.padStart(4, "0").slice(0, 4).split("");

  function copy() {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        toast.success("Código copiado");
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("No se pudo copiar."));
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] p-6 shadow-[var(--shadow-arena)]">
      <div className="halftone pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
            Código de invitación
          </p>
          <p className="pt-1 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Compártelo y se unen al instante.
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label="Copiar código"
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
            {copied ? (
              <Check className="size-4 text-[var(--color-success)]" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </button>
      </div>
    </div>
  );
}
