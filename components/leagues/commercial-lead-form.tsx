"use client";

import { useActionState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  submitCommercialLead,
  type CommercialLeadFormState,
} from "@/app/(public)/precios/actions";

const initialState: CommercialLeadFormState = { ok: false };

/**
 * Formulario público para que empresas/grupos pidan presupuesto o un
 * Pase Mundial 2026 a medida. Insertable en /precios y /contacto.
 *
 * Honeypot `website` anti-bot: si llega rellenado, el server action
 * descarta el envío silenciosamente.
 *
 * Tras envío exitoso, se reemplaza el form por un mensaje de éxito —
 * el usuario sabe que llegó sin necesidad de recargar.
 */
export function CommercialLeadForm({
  defaultMembers,
}: {
  defaultMembers?: number;
}) {
  const [state, action, pending] = useActionState(submitCommercialLead, initialState);

  if (state.ok) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] p-8 text-center">
        <div className="halftone pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
        <div className="relative space-y-3">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
            <CheckCircle2 className="size-6" />
          </span>
          <h3 className="font-display text-2xl tracking-tight">¡Gracias!</h3>
          <p className="font-editorial text-base italic text-[var(--color-muted-foreground)]">
            {state.message ??
              "Te respondo en menos de 24 h con presupuesto y siguiente paso."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {/* Honeypot — los humanos no lo ven, los bots lo rellenan. */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label>
          ¿Tu web? <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="name"
          label="Tu nombre"
          required
          placeholder="Ramón Romero"
          autoComplete="name"
        />
        <Field
          name="company"
          label="Empresa / grupo"
          placeholder="ACME S.L."
          autoComplete="organization"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="email"
          type="email"
          label="Email de contacto"
          required
          placeholder="tunombre@empresa.com"
          autoComplete="email"
        />
        <Field
          name="expectedMembers"
          type="number"
          label="Miembros previstos"
          placeholder="75"
          defaultValue={defaultMembers ? String(defaultMembers) : undefined}
          inputMode="numeric"
        />
      </div>

      <label className="block space-y-2">
        <span className="block font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          Mensaje · opcional
        </span>
        <textarea
          name="message"
          rows={4}
          maxLength={1500}
          placeholder="Cuéntame brevemente para qué la queréis, plazos, dudas…"
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-arena)]"
        />
      </label>

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          Te respondo en menos de 24 h.
        </p>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Enviando…" : "Enviar consulta"}
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  required,
  placeholder,
  type = "text",
  autoComplete,
  defaultValue,
  inputMode,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="group block space-y-1.5">
      <span className="block font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] transition-colors group-focus-within:text-[var(--color-arena)]">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        inputMode={inputMode}
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-arena)]"
      />
    </label>
  );
}
