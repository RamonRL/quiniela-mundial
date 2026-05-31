"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Check, Copy, LogOut, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { leaveLeague, setActiveLeague } from "@/lib/league-actions";
import { copyPredictionsBetweenLeaguesAction } from "@/app/predictions-actions";
import type { Membership } from "@/lib/leagues";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

export function MyLeaguesSection({
  memberships,
  activeLeagueId,
  privateCount,
  privateLimit,
  pickCountByLeagueId,
}: {
  memberships: Membership[];
  activeLeagueId: number | null;
  privateCount: number;
  /** Tope de privadas, o `null` para cuentas sin límite (admins). */
  privateLimit: number | null;
  /** Total de picks (suma de las 6 tablas pred_*) por liga del usuario. */
  pickCountByLeagueId: Record<number, number>;
}) {
  const [pending, start] = useTransition();

  const setActive = (id: number) => {
    const fd = new FormData();
    fd.set("leagueId", String(id));
    start(async () => {
      await setActiveLeague(fd);
    });
  };

  const leave = (id: number, name: string) => {
    if (
      !window.confirm(
        `Vas a abandonar "${name}". Perderás acceso a su ranking, chat y predicciones. ¿Continuar?`,
      )
    )
      return;
    const fd = new FormData();
    fd.set("leagueId", String(id));
    start(async () => {
      const res = await leaveLeague(fd);
      if (res.ok) toast.success(res.message ?? "Abandonada.");
      else toast.error(res.error ?? "No se pudo abandonar.");
    });
  };

  const copyFrom = (
    sourceId: number,
    sourceName: string,
    targetId: number,
    targetName: string,
  ) => {
    if (
      !window.confirm(
        `Copiar las predicciones de "${sourceName}" que falten en "${targetName}". No se sobrescribe ninguna que ya tengas en "${targetName}". ¿Continuar?`,
      )
    )
      return;
    const fd = new FormData();
    fd.set("sourceLeagueId", String(sourceId));
    fd.set("targetLeagueId", String(targetId));
    start(async () => {
      const res = await copyPredictionsBetweenLeaguesAction({ ok: false }, fd);
      if (res.ok) toast.success(res.message ?? "Predicciones copiadas.");
      else toast.error(res.error ?? "No se pudo copiar.");
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-[var(--color-arena)]" />
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Mis quinielas
            </p>
          </div>
          <h2 className="mt-2 font-display text-2xl tracking-tight">
            En las que participas
          </h2>
        </div>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          <span className="font-display text-base text-[var(--color-arena)]">
            {privateCount}
          </span>
          {privateLimit == null ? " privadas · sin límite" : `/${privateLimit} privadas`}
        </p>
      </header>

      <ul className="space-y-2">
        {memberships.map((m) => {
          const isActive = m.id === activeLeagueId;
          const thisCount = pickCountByLeagueId[m.id] ?? 0;
          // Otras ligas del usuario donde tiene MÁS predicciones que en esta —
          // son las únicas elegibles como origen para copiar hacia aquí. La
          // restricción "más → menos" es explícita por petición: nada de copiar
          // al revés y perder progreso (aunque internamente solo rellenemos
          // huecos, mostrar la opción confundiría).
          const eligibleSources = memberships.filter(
            (s) => s.id !== m.id && (pickCountByLeagueId[s.id] ?? 0) > thisCount,
          );
          return (
            <li
              key={m.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 transition ${
                isActive
                  ? "border-[var(--color-arena)]/50 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface-2))]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
              }`}
            >
              <div className="flex items-center gap-3">
                {!m.isPublic ? (
                  <Avatar className="size-8 shrink-0 border border-[var(--color-border)]">
                    {m.logoUrl ? (
                      <AvatarImage src={m.logoUrl} alt={m.name} />
                    ) : null}
                    <AvatarFallback className="text-[0.6rem] font-semibold">
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Trophy
                    className={`size-4 ${
                      isActive
                        ? "text-[var(--color-arena)]"
                        : "text-[var(--color-muted-foreground)]"
                    }`}
                  />
                )}
                <div className="space-y-0.5">
                  <p className="font-display text-base tracking-tight">{m.name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[0.65rem] text-[var(--color-muted-foreground)]">
                    {m.isPublic ? (
                      <Badge variant="success" className="text-[0.55rem]">
                        Permanente
                      </Badge>
                    ) : (
                      <>
                        {m.joinCode ? (
                          <span className="font-mono uppercase tracking-[0.18em] text-[var(--color-arena)]">
                            {m.joinCode}
                          </span>
                        ) : null}
                      </>
                    )}
                    <span className="font-mono uppercase tracking-[0.18em]">
                      {thisCount} pick{thisCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
                    <Check className="size-3" /> Activa
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => setActive(m.id)}
                  >
                    Hacer activa
                  </Button>
                )}
                {eligibleSources.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                      >
                        <Copy className="size-3.5" />
                        Copiar predicciones
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[16rem]">
                      <p className="px-2 pb-1.5 pt-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        {`Copiar a "${m.name}" desde…`}
                      </p>
                      {eligibleSources.map((s) => {
                        const sourceCount = pickCountByLeagueId[s.id] ?? 0;
                        return (
                          <DropdownMenuItem
                            key={s.id}
                            disabled={pending}
                            onSelect={() => copyFrom(s.id, s.name, m.id, m.name)}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                              +{sourceCount - thisCount}
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                {!m.isPublic ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => leave(m.id, m.name)}
                    className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                  >
                    <LogOut className="size-3.5" />
                    Abandonar
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[var(--color-border)] pt-4">
        <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          La pública es permanente. Las privadas, libres.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/onboarding?step=root">
            <Plus className="size-3.5" />
            Unirse o crear
          </Link>
        </Button>
      </div>
    </section>
  );
}
