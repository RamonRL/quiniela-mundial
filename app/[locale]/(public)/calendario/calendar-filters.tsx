"use client";

import Link from "next/link";
import { TeamFlag } from "@/components/brand/team-flag";
import { cn } from "@/lib/utils";

export type ActiveFilter =
  | { kind: "all" }
  | { kind: "group"; code: string }
  | { kind: "team"; code: string }
  | { kind: "stage"; stage: "r32" | "r16" | "qf" | "sf" | "final" };

type Group = { id: number; code: string };
type Team = { id: number; code: string; name: string; groupId: number | null };

const ROUNDS = [
  { stage: "r32", label: "Dieciseisavos" },
  { stage: "r16", label: "Octavos" },
  { stage: "qf", label: "Cuartos" },
  { stage: "sf", label: "Semifinales" },
  { stage: "final", label: "Final" },
] as const;

export function CalendarFilters({
  groups,
  teamsByGroup,
  active,
}: {
  groups: Group[];
  teamsByGroup: Map<number, Team[]>;
  active: ActiveFilter;
}) {
  return (
    <section className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      {/* ─── "Calendario completo" arriba, pill central ─── */}
      <div className="flex justify-center">
        <FilterPill href="/calendario" active={active.kind === "all"}>
          Calendario completo
        </FilterPill>
      </div>

      {/* ─── Grid de 12 grupos, scrollable en mobile ─── */}
      <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
        <div className="grid grid-flow-col auto-cols-[64px] gap-2 pb-2 sm:auto-cols-[72px] sm:gap-3 lg:auto-cols-[1fr]">
          {groups.map((g) => (
            <GroupCell
              key={g.code}
              group={g}
              teams={teamsByGroup.get(g.id) ?? []}
              active={active}
            />
          ))}
        </div>
      </div>

      {/* ─── Rondas eliminatorias, pills ─── */}
      <div className="flex flex-wrap justify-center gap-2">
        {ROUNDS.map((r) => (
          <FilterPill
            key={r.stage}
            href={`/calendario?stage=${r.stage}`}
            active={active.kind === "stage" && active.stage === r.stage}
          >
            {r.label}
          </FilterPill>
        ))}
      </div>
    </section>
  );
}

function GroupCell({
  group,
  teams,
  active,
}: {
  group: Group;
  teams: Team[];
  active: ActiveFilter;
}) {
  const groupActive = active.kind === "group" && active.code === group.code;
  const sorted = [...teams].slice(0, 4);
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition",
        groupActive
          ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)]"
          : "border-[var(--color-border)] hover:border-[var(--color-arena)]/40",
      )}
    >
      <Link
        href={`/calendario?group=${group.code}`}
        className={cn(
          "font-display text-xl tracking-tight transition-colors",
          groupActive
            ? "text-[var(--color-arena)] glow-arena"
            : "text-[var(--color-foreground)] hover:text-[var(--color-arena)]",
        )}
        aria-label={`Filtrar grupo ${group.code}`}
      >
        {group.code}
      </Link>
      <div className="grid grid-cols-2 gap-1">
        {Array.from({ length: 4 }).map((_, i) => {
          const team = sorted[i];
          if (!team) {
            return (
              <span
                key={i}
                aria-hidden
                className="size-5 rounded-full border border-dashed border-[var(--color-border)]"
              />
            );
          }
          const teamActive = active.kind === "team" && active.code === team.code;
          return (
            <Link
              key={team.code}
              href={`/calendario?team=${team.code}`}
              title={team.name}
              aria-label={`Filtrar ${team.name}`}
              className={cn(
                "block size-5 rounded-full transition",
                teamActive
                  ? "ring-2 ring-[var(--color-arena)] ring-offset-1 ring-offset-[var(--color-surface)]"
                  : "opacity-90 hover:opacity-100 hover:scale-110",
              )}
            >
              <TeamFlag code={team.code} size={20} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.28em] transition",
        active
          ? "border-[var(--color-arena)] bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)] hover:border-[var(--color-arena)]/40 hover:text-[var(--color-foreground)]",
      )}
    >
      {children}
    </Link>
  );
}
