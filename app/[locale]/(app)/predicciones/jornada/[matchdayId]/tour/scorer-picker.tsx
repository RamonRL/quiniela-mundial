"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Check } from "lucide-react";
import { PlayerAvatar } from "@/components/brand/player-avatar";
import { TeamFlag } from "@/components/brand/team-flag";

export type PlayerCardData = {
  id: number;
  teamId: number;
  name: string;
  jerseyNumber: number | null;
  position: string | null;
  photoUrl: string | null;
};

type TeamLite = { id: number; code: string; name: string };

const POSITION_LABEL_KEY: Record<string, string> = {
  DEL: "posDel",
  MED: "posMed",
  DEF: "posDef",
  POR: "posPor",
};
const POSITION_ORDER = ["DEL", "MED", "DEF", "POR"];
const POSITION_ACCENT: Record<string, string> = {
  DEL: "var(--color-arena)",
  MED: "var(--color-pitch)",
  DEF: "var(--color-amber)",
  POR: "var(--color-muted-foreground)",
};

function groupByPosition(players: PlayerCardData[]): Record<string, PlayerCardData[]> {
  const out: Record<string, PlayerCardData[]> = { DEL: [], MED: [], DEF: [], POR: [], "?": [] };
  for (const p of players) {
    const key = POSITION_ORDER.includes(p.position ?? "") ? (p.position as string) : "?";
    out[key].push(p);
  }
  // Dentro de cada grupo, ordenar por dorsal asc.
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99));
  }
  return out;
}

export function ScorerPicker({
  home,
  away,
  homePlayers,
  awayPlayers,
  selectedId,
  onSelect,
}: {
  home: TeamLite;
  away: TeamLite;
  homePlayers: PlayerCardData[];
  awayPlayers: PlayerCardData[];
  selectedId: number | null;
  onSelect: (playerId: number) => void;
}) {
  const t = useTranslations("predMatchday");
  // Tab inicial: si el goleador ya estaba en el equipo visitante, arrancamos
  // en "away". Se calcula UNA vez al montar (initializer); a partir de ahí el
  // usuario controla la pestaña libremente — antes había un efecto en render
  // que devolvía la tab al equipo del goleador y bloqueaba navegar al otro.
  const [activeTab, setActiveTab] = useState<"home" | "away">(() => {
    if (selectedId == null) return "home";
    const inAway = awayPlayers.some((p) => p.id === selectedId);
    const inHome = homePlayers.some((p) => p.id === selectedId);
    return inAway && !inHome ? "away" : "home";
  });

  // Jugador seleccionado (de cualquiera de los dos equipos) + su equipo, para
  // la preview pegajosa de móvil: el goleador elegido se ve SIEMPRE aunque
  // cambies de pestaña de equipo — así queda claro que es uno solo, no uno
  // por equipo.
  const selectedPlayer =
    selectedId == null
      ? null
      : homePlayers.find((p) => p.id === selectedId) ??
        awayPlayers.find((p) => p.id === selectedId) ??
        null;
  const selectedTeam = selectedPlayer
    ? selectedPlayer.teamId === home.id
      ? home
      : away
    : null;

  return (
    <div className="space-y-3">
      {/* Tabs móvil ─ desktop tiene ambas columnas visibles. */}
      <div className="grid grid-cols-2 gap-1 rounded-md bg-[var(--color-surface-2)] p-1 md:hidden">
        <TabButton active={activeTab === "home"} onClick={() => setActiveTab("home")}>
          <TeamFlag code={home.code} size={20} />
          {home.name}
        </TabButton>
        <TabButton active={activeTab === "away"} onClick={() => setActiveTab("away")}>
          <TeamFlag code={away.code} size={20} />
          {away.name}
        </TabButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TeamColumn
          team={home}
          players={homePlayers}
          selectedId={selectedId}
          onSelect={onSelect}
          hiddenOnMobile={activeTab !== "home"}
        />
        <TeamColumn
          team={away}
          players={awayPlayers}
          selectedId={selectedId}
          onSelect={onSelect}
          hiddenOnMobile={activeTab !== "away"}
        />
      </div>

      {/* Preview pegajosa (solo móvil): el goleador elegido, anclado abajo —
          encima de la barra anterior/siguiente. Es `sticky bottom-0`: mientras
          haces scroll queda fijado al fondo y, al llegar al final de la lista,
          se asienta tras la última card (porteros) — así se ven todas enteras
          con el goleador justo debajo. En desktop no hace falta (ambas
          columnas están a la vista). */}
      {selectedPlayer && selectedTeam ? (
        <div className="sticky bottom-0 z-10 -mx-1 mt-2 md:hidden">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--color-arena)]/50 bg-[color-mix(in_oklch,var(--color-bg)_90%,transparent)] px-3 py-2.5 shadow-[var(--shadow-elev-2)] backdrop-blur">
            <PlayerAvatar
              name={selectedPlayer.name}
              photoUrl={selectedPlayer.photoUrl}
              jerseyNumber={selectedPlayer.jerseyNumber}
              size={40}
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[0.5rem] uppercase tracking-[0.22em] text-[var(--color-arena)]">
                {t("scorerPickedLabel")}
              </p>
              <p className="truncate font-display text-base leading-tight tracking-tight">
                {selectedPlayer.name}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              {selectedPlayer.jerseyNumber != null ? `#${selectedPlayer.jerseyNumber}` : null}
              <TeamFlag code={selectedTeam.code} size={20} />
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md font-mono text-[0.65rem] uppercase tracking-[0.16em] transition ${
        active
          ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

function TeamColumn({
  team,
  players,
  selectedId,
  onSelect,
  hiddenOnMobile,
}: {
  team: TeamLite;
  players: PlayerCardData[];
  selectedId: number | null;
  onSelect: (playerId: number) => void;
  hiddenOnMobile: boolean;
}) {
  const t = useTranslations("predMatchday");
  const groups = groupByPosition(players);
  const unofficial = players.length > 0 && players.every((p) => !p.photoUrl);
  return (
    <div className={`space-y-3 ${hiddenOnMobile ? "hidden md:block" : ""}`}>
      <div className="hidden items-center gap-2 md:flex">
        <TeamFlag code={team.code} size={20} />
        <h3 className="font-display text-base tracking-tight">{team.name}</h3>
      </div>
      {unofficial ? <UnofficialSquadNotice /> : null}
      {POSITION_ORDER.map((pos) => {
        const list = groups[pos];
        if (!list || list.length === 0) return null;
        return (
          <section key={pos} className="space-y-2">
            <p
              className="font-mono text-[0.55rem] uppercase tracking-[0.18em]"
              style={{ color: POSITION_ACCENT[pos] }}
            >
              {t(POSITION_LABEL_KEY[pos])}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
              {list.map((p) => (
                <PlayerOption
                  key={p.id}
                  player={p}
                  selected={selectedId === p.id}
                  accent={POSITION_ACCENT[pos]}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        );
      })}
      {groups["?"] && groups["?"].length > 0 ? (
        <section className="space-y-2">
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {t("noPosition")}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
            {groups["?"].map((p) => (
              <PlayerOption
                key={p.id}
                player={p}
                selected={selectedId === p.id}
                accent="var(--color-muted-foreground)"
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function UnofficialSquadNotice() {
  const t = useTranslations("predMatchday");
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
      <div className="space-y-0.5">
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
          {t("unofficialTitle")}
        </p>
        <p className="font-editorial text-[0.72rem] italic leading-snug text-[var(--color-muted-foreground)]">
          {t("unofficialDesc")}
        </p>
      </div>
    </div>
  );
}

function PlayerOption({
  player,
  selected,
  accent,
  onSelect,
}: {
  player: PlayerCardData;
  selected: boolean;
  accent: string;
  onSelect: (playerId: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(player.id)}
      aria-pressed={selected}
      className={`group relative flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition ${
        selected
          ? "scale-[1.03] shadow-[var(--shadow-arena)]"
          : "hover:-translate-y-0.5 hover:shadow-[var(--shadow-elev-1)]"
      }`}
      style={{
        borderColor: selected ? accent : "var(--color-border)",
        background: selected
          ? `color-mix(in oklch, ${accent} 8%, var(--color-surface))`
          : "var(--color-surface)",
      }}
    >
      <div className="relative">
        <PlayerAvatar
          name={player.name}
          photoUrl={player.photoUrl}
          jerseyNumber={player.jerseyNumber}
          size={56}
        />
        {selected ? (
          <span
            className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full text-white"
            style={{ backgroundColor: accent }}
          >
            <Check className="size-3" />
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[0.7rem] font-medium leading-tight">{player.name}</p>
        {player.jerseyNumber != null ? (
          <p className="font-mono text-[0.55rem] tracking-[0.1em] text-[var(--color-muted-foreground)]">
            #{player.jerseyNumber}
          </p>
        ) : null}
      </div>
    </button>
  );
}
