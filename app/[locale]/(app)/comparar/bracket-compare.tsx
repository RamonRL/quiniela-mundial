import { getTranslations } from "next-intl/server";
import { Crown, Swords, Check } from "lucide-react";
import { TeamFlag } from "@/components/brand/team-flag";
import { cn } from "@/lib/utils";
import { BracketBuilder, type TeamLite } from "../predicciones/bracket/bracket-builder";
import type { BracketPicks } from "@/lib/bracket-data";

type Team = { id: number; code: string; name: string };

/**
 * Comparación de brackets en /comparar (modo Completo): un "duelo de campeones"
 * como pieza protagonista (tu campeón vs el suyo, con veredicto), una tira de
 * finalistas y 3.º con las coincidencias marcadas, y debajo el cuadro completo
 * del rival en solo lectura. Se desbloquea cuando el bracket es público (al
 * arrancar los dieciseisavos).
 */
export async function BracketCompare({
  oppName,
  teams,
  r32Pairings,
  mine,
  opp,
  teamById,
}: {
  oppName: string;
  teams: TeamLite[];
  r32Pairings: Record<string, { homeId: number | null; awayId: number | null }>;
  mine: BracketPicks;
  opp: BracketPicks;
  teamById: Map<number, Team>;
}) {
  const t = await getTranslations("compare");
  const team = (id: number | null) => (id != null ? teamById.get(id) ?? null : null);
  const myChamp = team(mine.championTeamId);
  const oppChamp = team(opp.championTeamId);
  const sameChamp = mine.championTeamId != null && mine.championTeamId === opp.championTeamId;

  const oppHasBracket =
    opp.championTeamId != null ||
    opp.finalists.length > 0 ||
    opp.r16.length > 0;

  if (!oppHasBracket) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
        {t("brEmptyOpp", { name: oppName })}
      </p>
    );
  }

  const sharedFinalists = new Set(mine.finalists.filter((id) => opp.finalists.includes(id)));

  return (
    <div className="space-y-5">
      {/* ── Duelo de campeones (pieza protagonista) ── */}
      <section className="rise-in relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/45 bg-[var(--color-surface)] shadow-[var(--shadow-elev-1)]">
        <span aria-hidden className="spotlight pointer-events-none absolute inset-0 opacity-100" />
        <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-arena)]/50 to-transparent"
        />
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-5 sm:gap-4 sm:p-7">
          <ChampPole label={t("brYou")} team={myChamp} align="start" noPickLabel={t("brNoPick")} />
          <Verdict same={sameChamp} sameLabel={t("brSameChamp")} vsLabel={t("brVs")} />
          <ChampPole label={oppName} team={oppChamp} align="end" noPickLabel={t("brNoPick")} />
        </div>
      </section>

      {/* ── Finalistas + 3.º: tu pick vs el suyo, coincidencias marcadas ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <CompareRow
          label={t("brFinalists")}
          mine={mine.finalists.map(team).filter((x): x is Team => x != null)}
          opp={opp.finalists.map(team).filter((x): x is Team => x != null)}
          shared={sharedFinalists}
          youLabel={t("brYou")}
          oppName={oppName}
          noPickLabel={t("brNoPick")}
        />
        <CompareRow
          label={t("brThird")}
          mine={myThird(mine, team)}
          opp={myThird(opp, team)}
          shared={
            mine.thirdTeamId != null && mine.thirdTeamId === opp.thirdTeamId
              ? new Set([mine.thirdTeamId])
              : new Set()
          }
          youLabel={t("brYou")}
          oppName={oppName}
          noPickLabel={t("brNoPick")}
        />
      </div>

      {/* ── Cuadro completo del rival (solo lectura) ── */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-arena)]">
          <Swords className="size-3.5" />
          {t("brTheirBracket", { name: oppName })}
        </h3>
        <BracketBuilder
          spectator
          open={false}
          teams={teams}
          r32Pairings={r32Pairings}
          initial={opp}
        />
      </div>
    </div>
  );
}

function myThird(picks: BracketPicks, team: (id: number | null) => Team | null): Team[] {
  const t = team(picks.thirdTeamId);
  return t ? [t] : [];
}

/** Pilar del campeón: bandera grande + nombre, con glow si hay pick. */
function ChampPole({
  label,
  team,
  align,
  noPickLabel,
}: {
  label: string;
  team: Team | null;
  align: "start" | "end";
  noPickLabel: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", align === "end" ? "items-end text-right" : "items-start text-left")}>
      <span className="flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        <Crown className="size-3 text-[var(--color-arena)]" />
        {label}
      </span>
      <TeamFlag code={team?.code} size={56} className="ring-1 ring-[var(--color-border)]" />
      <span
        className={cn(
          "font-display text-xl leading-none tracking-tight sm:text-2xl",
          team ? "text-[var(--color-arena)] glow-arena" : "text-[var(--color-muted-foreground)]",
        )}
      >
        {team ? team.name : noPickLabel}
      </span>
    </div>
  );
}

/** Veredicto central: "mismo campeón" (pitch) o "VS" (arena). */
function Verdict({ same, sameLabel, vsLabel }: { same: boolean; sameLabel: string; vsLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          "grid size-11 place-items-center rounded-full font-display text-base leading-none text-white shadow-[var(--shadow-arena)] sm:size-12",
          same ? "bg-[var(--color-pitch)]" : "bg-[var(--color-arena)]",
        )}
      >
        {same ? <Check className="size-5" /> : vsLabel}
      </span>
      {same ? (
        <span className="max-w-[6rem] text-center font-mono text-[0.5rem] uppercase leading-tight tracking-[0.18em] text-[var(--color-pitch)]">
          {sameLabel}
        </span>
      ) : null}
    </div>
  );
}

/** Fila comparativa: chips de TÚ vs rival, con anillo arena en coincidencias. */
function CompareRow({
  label,
  mine,
  opp,
  shared,
  youLabel,
  oppName,
  noPickLabel,
}: {
  label: string;
  mine: Team[];
  opp: Team[];
  shared: Set<number>;
  youLabel: string;
  oppName: string;
  noPickLabel: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <div className="space-y-2">
        <ChipRow who={youLabel} teams={mine} shared={shared} noPickLabel={noPickLabel} />
        <ChipRow who={oppName} teams={opp} shared={shared} noPickLabel={noPickLabel} />
      </div>
    </div>
  );
}

function ChipRow({
  who,
  teams,
  shared,
  noPickLabel,
}: {
  who: string;
  teams: Team[];
  shared: Set<number>;
  noPickLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 truncate font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
        {who}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {teams.length === 0 ? (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            {noPickLabel}
          </span>
        ) : (
          teams.map((tm) => (
            <span
              key={tm.id}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.1em]",
                shared.has(tm.id)
                  ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] text-[var(--color-arena)]"
                  : "border-[var(--color-border)] text-[var(--color-foreground)]",
              )}
            >
              <TeamFlag code={tm.code} size={16} bare />
              {tm.code}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
