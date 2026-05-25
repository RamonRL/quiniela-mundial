"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Banknote, Check, CircleDollarSign, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createPendingPayment } from "./actions";
import type { PaidTier } from "./tier-meta";

type Method = "bizum" | "bank" | "paypal";

const METHODS: { id: Method; label: string; icon: typeof Banknote }[] = [
  { id: "bizum", label: "Bizum", icon: Smartphone },
  { id: "bank", label: "Transferencia", icon: Banknote },
  { id: "paypal", label: "PayPal", icon: CircleDollarSign },
];

export function PayManualForm({
  tier,
  priceEur,
  initialLeagueCode,
  initialName,
  initialEmail,
}: {
  tier: PaidTier;
  priceEur: number;
  initialLeagueCode: string | null;
  initialName: string | null;
  initialEmail: string | null;
}) {
  const [method, setMethod] = useState<Method>("bizum");
  const [leagueCode, setLeagueCode] = useState(initialLeagueCode ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tier", tier);
    fd.set("method", method);
    startTransition(async () => {
      const res = await createPendingPayment(fd);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo registrar el pago.");
        return;
      }
      toast.success("Pago registrado. Abrimos el email del comprobante.");
      setDone(true);
      if (res.mailtoUrl) {
        // Pequeño delay para que el toast asiente antes del mailto.
        setTimeout(() => {
          window.location.href = res.mailtoUrl!;
        }, 200);
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-3 rounded-lg border border-[var(--color-success)]/40 bg-[color-mix(in_oklch,var(--color-success)_8%,var(--color-surface))] p-5">
        <p className="inline-flex items-center gap-2 font-display text-xl tracking-tight text-[var(--color-success)]">
          <Check className="size-5" /> Registrado
        </p>
        <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
          Hemos registrado tu intención de pago. Si tu cliente de correo no se abrió, escríbenos directamente con el comprobante a{" "}
          <a className="text-[var(--color-arena)]" href="mailto:admin@quinielamundial.es">
            admin@quinielamundial.es
          </a>{" "}
          indicando el concepto del pago.
        </p>
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
          Plazo habitual de activación: menos de 24 h tras verificar el ingreso.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Selector de método */}
      <fieldset className="space-y-2">
        <legend className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
          Método elegido
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => {
            const active = method === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border px-3 py-3 transition",
                  active
                    ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] text-[var(--color-arena)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:border-[var(--color-arena)]/40",
                )}
              >
                <Icon className="size-4" />
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em]">
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Datos de contacto / liga */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="name" value={name} onChange={setName} placeholder="Tu nombre" />
        <Field
          label="Email de contacto"
          name="email"
          type="email"
          required
          value={email}
          onChange={setEmail}
          placeholder="tu@email.com"
        />
        <Field
          label="Código de tu liga (4 letras/números)"
          name="leagueJoinCode"
          value={leagueCode}
          onChange={(v) => setLeagueCode(v.toUpperCase())}
          placeholder="A1B2"
          maxLength={8}
          hint="Lo encuentras en la pantalla de tu quiniela privada. Déjalo en blanco si aún no la has creado."
        />
        <Field
          label="Notas (opcional)"
          name="notes"
          value={notes}
          onChange={setNotes}
          placeholder="Datos fiscales, contexto, etc."
        />
      </div>

      <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
        Al pulsar el botón registramos tu intención de pago y se abrirá tu cliente de correo con el mensaje listo. Solo te quedará adjuntar la captura / PDF del comprobante.
      </p>

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        {pending ? "Registrando…" : `He hecho el pago de ${priceEur} €`}
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  maxLength,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-arena)]"
      />
      {hint ? (
        <span className="block font-editorial text-[0.7rem] italic text-[var(--color-muted-foreground)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
