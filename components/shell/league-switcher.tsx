"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { setActiveLeague } from "@/lib/league-actions";
import type { Membership } from "@/lib/leagues";
import { initials } from "@/lib/utils";

export function LeagueSwitcher({
  memberships,
  activeLeagueId,
}: {
  memberships: Membership[];
  activeLeagueId: number | null;
}) {
  const active = memberships.find((m) => m.id === activeLeagueId) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-tutorial-id="league-switcher"
          aria-label="Cambiar quiniela activa"
          className="group inline-flex max-w-[26rem] items-center gap-2 rounded-sm transition hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-arena)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        >
          {active && !active.isPublic ? (
            <Avatar className="size-7 shrink-0 border border-[var(--color-border)]">
              {active.logoUrl ? (
                <AvatarImage src={active.logoUrl} alt={active.name} />
              ) : null}
              <AvatarFallback className="text-[0.55rem] font-semibold">
                {initials(active.name)}
              </AvatarFallback>
            </Avatar>
          ) : null}
          <span className="truncate font-display text-xl uppercase tracking-[0.06em] text-[var(--color-foreground)] sm:text-2xl">
            {active?.name ?? "Selecciona quiniela"}
          </span>
          <ChevronsUpDown
            className="size-3.5 shrink-0 text-[var(--color-muted-foreground)] opacity-40 transition-opacity group-hover:opacity-80"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-72">
        <DropdownMenuLabel>Mis quinielas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => {
          const isActive = m.id === activeLeagueId;
          return (
            <form key={m.id} action={setActiveLeague}>
              <input type="hidden" name="leagueId" value={m.id} />
              <DropdownMenuItem
                asChild
                className={isActive ? "bg-[var(--color-surface-2)]" : ""}
              >
                <button type="submit" className="flex w-full items-center gap-2">
                  {!m.isPublic ? (
                    <Avatar className="size-6 shrink-0 border border-[var(--color-border)]">
                      {m.logoUrl ? (
                        <AvatarImage src={m.logoUrl} alt={m.name} />
                      ) : null}
                      <AvatarFallback className="text-[0.5rem] font-semibold">
                        {initials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate text-left">
                    <span className="font-medium">{m.name}</span>
                    {!m.isPublic && m.joinCode ? (
                      <span className="ml-1.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        · {m.joinCode}
                      </span>
                    ) : null}
                  </span>
                  {isActive ? (
                    <Check className="size-3.5 text-[var(--color-arena)]" />
                  ) : null}
                </button>
              </DropdownMenuItem>
            </form>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/onboarding"
            className="flex w-full items-center gap-2 text-[var(--color-arena)]"
          >
            <Plus className="size-3.5" />
            Unirse o crear quiniela
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
