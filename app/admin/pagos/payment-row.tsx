"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updatePendingPayment } from "./actions";

type Status = "pending" | "verified" | "rejected";

const STATUS_OPTIONS: { id: Status; label: string }[] = [
  { id: "pending", label: "Pendiente" },
  { id: "verified", label: "Verificado" },
  { id: "rejected", label: "Rechazado" },
];

export function PaymentRow({
  payment,
}: {
  payment: {
    id: number;
    status: Status | string;
    notes: string | null;
  };
}) {
  const [status, setStatus] = useState<Status>(
    (STATUS_OPTIONS.find((o) => o.id === payment.status)?.id ?? "pending") as Status,
  );
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await updatePendingPayment(formData);
      if (!res.ok) toast.error(res.error ?? "No se pudo actualizar.");
      else toast.success("Actualizado.");
    });
  }

  return (
    <div className="space-y-1.5">
      <form action={submit} className="flex items-center gap-2">
        <input type="hidden" name="id" value={payment.id} />
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-arena)]"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "…" : "OK"}
        </Button>
        {open ? null : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] hover:text-[var(--color-arena)]"
          >
            +
          </button>
        )}
      </form>
      {open ? (
        <form action={submit} className="space-y-1.5">
          <input type="hidden" name="id" value={payment.id} />
          <input type="hidden" name="status" value={status} />
          <textarea
            name="notes"
            rows={2}
            defaultValue={payment.notes ?? ""}
            placeholder="Notas internas (ej. fecha del ingreso bancario)…"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-arena)]"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              Guardar
            </Button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]"
            >
              cerrar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
