"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type AdminOption = { id: string; label: string };
type ActionOption = { value: string; count: number };

export function AuditFilters({
  admins,
  actions,
}: {
  admins: AdminOption[];
  actions: ActionOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const current = {
    admin: params.get("admin") ?? "",
    action: params.get("action") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
  };

  function update(patch: Partial<typeof current>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    next.delete("page"); // resetear paginación al cambiar filtros
    startTransition(() => {
      router.push(`/admin/monitoreo/auditoria?${next.toString()}`);
    });
  }

  function reset() {
    startTransition(() => {
      router.push("/admin/monitoreo/auditoria");
    });
  }

  const hasFilters = !!(current.admin || current.action || current.from || current.to);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <Field label="Admin">
        <select
          value={current.admin}
          onChange={(e) => update({ admin: e.target.value })}
          className="min-w-[180px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Acción">
        <select
          value={current.action}
          onChange={(e) => update({ action: e.target.value })}
          className="min-w-[220px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm"
        >
          <option value="">Todas</option>
          {actions.map((a) => (
            <option key={a.value} value={a.value}>
              {a.value} · {a.count}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Desde">
        <input
          type="date"
          value={current.from}
          onChange={(e) => update({ from: e.target.value })}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Hasta">
        <input
          type="date"
          value={current.to}
          onChange={(e) => update({ to: e.target.value })}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm"
        />
      </Field>
      {hasFilters ? (
        <button
          type="button"
          onClick={reset}
          className="self-end rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition hover:border-[var(--color-arena)]/40 hover:text-[var(--color-foreground)]"
        >
          Limpiar
        </button>
      ) : null}
      {pending ? (
        <span className="self-end font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Cargando…
        </span>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        {label}
      </span>
      {children}
    </label>
  );
}
