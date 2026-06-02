"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_OPTIONS = [
  { v: "all", l: "Todos los roles" },
  { v: "user", l: "Usuario" },
  { v: "admin", l: "Admin" },
] as const;

const STATUS_OPTIONS = [
  { v: "all", l: "Todos los estados" },
  { v: "active", l: "Activos" },
  { v: "suspended", l: "Suspendidos" },
] as const;

/**
 * Barra de filtros de /admin/usuarios. Empuja los cambios a la URL (search,
 * role, status) preservando el orden (sort/dir) y `per`, y reseteando `page`
 * a 1. El orden por columna vive en los <th> como Links server-side.
 */
export function UsersFilters({
  q,
  role,
  status,
}: {
  q: string;
  role: string;
  status: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(q);

  function navigate(overrides: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `/admin/usuarios?${qs}` : "/admin/usuarios");
  }

  const active = q !== "" || role !== "all" || status !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <form
        className="relative min-w-[12rem] flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ q: search.trim() });
        }}
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por apodo o email…"
          className="h-8 pl-8 text-sm"
        />
      </form>
      <Select value={role} onValueChange={(v) => navigate({ role: v })}>
        <SelectTrigger className="h-8 w-[9.5rem] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((o) => (
            <SelectItem key={o.v} value={o.v}>
              {o.l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => navigate({ status: v })}>
        <SelectTrigger className="h-8 w-[10rem] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.v} value={o.v}>
              {o.l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active ? (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            navigate({ q: "", role: "all", status: "all" });
          }}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] transition hover:border-[var(--color-arena)]/50 hover:text-[var(--color-foreground)]"
        >
          <X className="size-3" />
          Limpiar
        </button>
      ) : null}
    </div>
  );
}
