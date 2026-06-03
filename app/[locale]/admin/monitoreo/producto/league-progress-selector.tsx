"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LeagueOption = {
  id: number;
  name: string;
  isPublic: boolean;
  members: number;
};

/**
 * Selector cliente que cambia la liga vista en la sección de progreso
 * de predicciones por usuario. Empuja `?league=<id>` a la URL via
 * router.push; el server component padre lee searchParams y re-fetcha.
 *
 * Mantiene cualquier otro query param que pudiera existir (por si en
 * el futuro coexiste con filtros adicionales).
 */
export function LeagueProgressSelector({
  leagues,
  currentLeagueId,
}: {
  leagues: LeagueOption[];
  currentLeagueId: number | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("league", value);
    start(() => {
      router.push(`/admin/monitoreo/producto?${next.toString()}#predicciones-por-liga`);
    });
  }

  return (
    <Select value={currentLeagueId ? String(currentLeagueId) : ""} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full sm:w-[18rem]" disabled={pending}>
        <SelectValue placeholder="Elige una liga…" />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {leagues.map((l) => (
          <SelectItem key={l.id} value={String(l.id)}>
            <span className="flex items-center gap-2">
              <span className="truncate">{l.name}</span>
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                {l.isPublic ? "pública" : "privada"} · {l.members}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
