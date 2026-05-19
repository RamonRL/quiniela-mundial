"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = Omit<ButtonProps, "size" | "variant" | "children"> & {
  /**
   * Estado pending del Server Action (devuelto por `useActionState`).
   * Mientras es true, el botón muestra un Loader2 girando, cambia el
   * texto a `pendingLabel` y se queda disabled.
   */
  pending: boolean;
  /** Texto del botón en reposo. Por defecto "Guardar". */
  children?: React.ReactNode;
  /** Texto durante el guardado. Por defecto "Guardando…". */
  pendingLabel?: string;
};

/**
 * Botón "Guardar" específico para los formularios de predicción.
 *
 * Se construye sobre `<Button>` (variante `default` arena + size lg) y
 * compone una capa de estilo "CTA editorial": font-display uppercase,
 * tracking ancho, ancho mínimo para que el botón no se redimensione
 * entre los dos estados (reposo / pending) y un glow más pronunciado en
 * hover. La iconografía cambia de Save a Loader2 cuando pending=true.
 *
 * Reutiliza el sistema de variantes existente; no introduce una nueva
 * entrada en `cva` para evitar proliferar API: si en el futuro alguien
 * quiere un "CTA editorial" en otra parte, podemos promoverlo a
 * variante propia.
 */
export function SavePredictionButton({
  pending,
  disabled,
  children = "Guardar",
  pendingLabel = "Guardando…",
  className,
  ...props
}: Props) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn(
        "font-display min-w-[10.5rem] uppercase tracking-[0.18em] shadow-[var(--shadow-arena)] transition-all hover:shadow-[0_6px_0_color-mix(in_oklch,var(--color-arena)_70%,black)]",
        className,
      )}
      {...props}
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Save />
      )}
      {pending ? pendingLabel : children}
    </Button>
  );
}
