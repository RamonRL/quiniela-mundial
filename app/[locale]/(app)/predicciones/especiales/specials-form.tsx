"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  CircleHelp,
  Globe2,
  Hash,
  ListChecks,
  Lock,
  Search,
  User,
  X,
} from "lucide-react";
import { TeamFlag } from "@/components/brand/team-flag";
import { SavePredictionButton } from "@/components/predictions/save-prediction-button";
import { SaveOverlay } from "@/components/predictions/save-overlay";
import { usePredictionSaveToast } from "@/lib/predictions/use-save-toast";
import { useDateFormat } from "@/components/shell/timezone-provider";
import { cn, formatDateTime } from "@/lib/utils";
import { saveSpecialPredictions, type FormState } from "./actions";
import { maxPointsForSpecial as maxPointsFor } from "./points";
import {
  isSpecialAnswered as isSpecialAnsweredHelper,
  type SpecialDef,
  type SpecialType,
} from "./types";

export type { SpecialDef, SpecialType };

const initial: FormState = { ok: false };

type Existing = { specialId: number; valueJson: Record<string, unknown> };

type Props = {
  specials: SpecialDef[];
  existing: Existing[];
  players: { id: number; name: string; position: string | null; teamId: number }[];
  teams: { id: number; code: string; name: string }[];
};

const TYPE_META: Record<
  SpecialType,
  { labelKey: string; icon: typeof Hash; accent: string }
> = {
  yes_no: { labelKey: "typeYesNo", icon: CircleHelp, accent: "text-amber-500" },
  single_choice: { labelKey: "typeSingle", icon: ListChecks, accent: "text-sky-400" },
  team_with_round: { labelKey: "typeTeamRound", icon: Globe2, accent: "text-emerald-500" },
  number_range: { labelKey: "typeNumber", icon: Hash, accent: "text-[var(--color-arena)]" },
  player: { labelKey: "typePlayer", icon: User, accent: "text-indigo-400" },
};

const ROUND_LABEL_KEY: Record<string, string> = {
  group: "roundGroup",
  r32: "roundR32",
  r16: "roundR16",
  qf: "roundQf",
  sf: "roundSf",
  final: "roundFinal",
  champion: "roundChampion",
};

const isAnswered = isSpecialAnsweredHelper;

export function SpecialsForm({ specials, existing, players, teams }: Props) {
  const t = useTranslations("predSpecials");
  const { timeZone, locale } = useDateFormat();
  const initialMap: Record<number, Record<string, unknown>> = Object.fromEntries(
    specials.map((s) => [s.id, {}]),
  );
  for (const e of existing) initialMap[e.specialId] = e.valueJson;

  const [values, setValues] = useState(initialMap);
  const [state, action, pending] = useActionState(saveSpecialPredictions, initial);
  // Solo lectura: si NINGUNA especial está abierta (todas cerradas), no se
  // muestra la barra de guardar. Aun así, la server action rechaza cualquier
  // escritura de una especial cerrada (closesAt <= now) — doble candado.
  const anyOpen = specials.some((s) => new Date(s.closesAt).getTime() > Date.now());

  usePredictionSaveToast(state, {
    successTitle: t("savedTitle"),
    successDescription: t("savedDesc"),
  });

  const payload = {
    predictions: specials.map((s) => ({
      specialId: s.id,
      valueJson: values[s.id] ?? {},
    })),
  };

  const answered = specials.filter((s) => isAnswered(values[s.id], s.type)).length;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      {/* Cabecera de progreso */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-display tabular text-2xl tracking-tight text-[var(--color-arena)] glow-arena">
            {answered}
            <span className="text-base text-[var(--color-muted-foreground)]"> / {specials.length}</span>
          </span>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("answeredLabel")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {specials.map((s) => {
          const open = new Date(s.closesAt).getTime() > Date.now();
          const maxPts = maxPointsFor(s.pointsConfigJson);
          const meta = TYPE_META[s.type];
          const Icon = meta.icon;
          const v = values[s.id] ?? {};
          const done = isAnswered(v, s.type);
          const perRound = !!(s.pointsConfigJson as { perRound?: unknown })?.perRound;
          // Para team_with_round con la nueva fórmula (correct + exactRoundBonus)
          // los puntos se muestran inline junto a cada selector — no en el footer.
          const splitPoints =
            s.type === "team_with_round" &&
            typeof (s.pointsConfigJson as { correct?: unknown })?.correct === "number" &&
            typeof (s.pointsConfigJson as { exactRoundBonus?: unknown })?.exactRoundBonus ===
              "number";
          return (
            <article
              key={s.id}
              className={cn(
                "relative flex flex-col gap-4 rounded-2xl border p-5 transition-all",
                done
                  ? "border-[var(--color-arena)]/50 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)]",
                !open && "opacity-75",
              )}
            >
              {/* Header */}
              <header className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]",
                      meta.accent,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="leading-tight">
                    <p className={cn("font-mono text-[0.55rem] uppercase tracking-[0.28em]", meta.accent)}>
                      {t(meta.labelKey)}
                    </p>
                    <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {t("closeShort", {
                        date: formatDateTime(s.closesAt, { timeZone, locale, day: "2-digit", month: "short" }),
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {done ? (
                    <span className="grid size-6 place-items-center rounded-full bg-[var(--color-arena)] text-white">
                      <Check className="size-3.5" />
                    </span>
                  ) : null}
                  {!open ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-warning)]">
                      <Lock className="size-3" />
                      {t("closed")}
                    </span>
                  ) : null}
                </div>
              </header>

              {/* Pregunta */}
              <h3 className="font-display text-xl leading-snug tracking-tight sm:text-2xl">
                {s.question}
              </h3>

              {/* Field */}
              <div className="flex-1">
                <FieldFor
                  special={s}
                  value={v}
                  onChange={(next) => setValues((prev) => ({ ...prev, [s.id]: next }))}
                  disabled={!open}
                  players={players}
                  teams={teams}
                />
              </div>

              {/* Footer · puntos (oculto para team_with_round split: los pts
                  se muestran inline en el field, junto a banderas y rondas) */}
              {maxPts != null && !splitPoints ? (
                <footer className="flex items-center justify-between gap-2 border-t border-dashed border-[var(--color-border)] pt-3">
                  {perRound ? (
                    <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
                      {t("upTo")}
                    </p>
                  ) : (
                    <span aria-hidden />
                  )}
                  <p className="font-display tabular text-2xl tracking-tight text-[var(--color-arena)] glow-arena">
                    +{maxPts}
                    <span className="ml-1 text-[0.55rem] uppercase tracking-[0.18em] opacity-70">
                      {maxPts === 1 ? "pt" : "pts"}
                    </span>
                  </p>
                </footer>
              ) : null}
            </article>
          );
        })}
      </div>

      {anyOpen ? (
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-10 flex justify-center rounded-xl border border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-surface)_92%,transparent)] p-2 backdrop-blur-md sm:bottom-3">
          <SavePredictionButton pending={pending} />
        </div>
      ) : null}

      <SaveOverlay open={pending} />
    </form>
  );
}

// ──────────────── Fields ────────────────

export function SpecialField(props: {
  special: SpecialDef;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  disabled: boolean;
  players: { id: number; name: string; position: string | null; teamId: number }[];
  teams: { id: number; code: string; name: string }[];
}) {
  return <FieldFor {...props} />;
}

function FieldFor({
  special,
  value,
  onChange,
  disabled,
  players,
  teams,
}: {
  special: SpecialDef;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  disabled: boolean;
  players: { id: number; name: string; position: string | null; teamId: number }[];
  teams: { id: number; code: string; name: string }[];
}) {
  switch (special.type) {
    case "yes_no":
      return <YesNoField value={value} onChange={onChange} disabled={disabled} />;
    case "single_choice":
      return <SingleChoiceField special={special} value={value} onChange={onChange} disabled={disabled} />;
    case "number_range":
      return <NumberField special={special} value={value} onChange={onChange} disabled={disabled} />;
    case "team_with_round":
      return (
        <TeamRoundField
          special={special}
          value={value}
          onChange={onChange}
          disabled={disabled}
          teams={teams}
        />
      );
    case "player":
      return (
        <PlayerField
          special={special}
          value={value}
          onChange={onChange}
          disabled={disabled}
          players={players}
          teams={teams}
        />
      );
  }
}

function YesNoField({
  value,
  onChange,
  disabled,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const t = useTranslations("predSpecials");
  const v = value.value as boolean | undefined;
  return (
    <div className="grid grid-cols-2 gap-2">
      <ChoicePill
        active={v === true}
        disabled={disabled}
        onClick={() => onChange({ value: v === true ? null : true })}
        accent="success"
      >
        <Check className="size-4" /> {t("yes")}
      </ChoicePill>
      <ChoicePill
        active={v === false}
        disabled={disabled}
        onClick={() => onChange({ value: v === false ? null : false })}
        accent="danger"
      >
        <X className="size-4" /> {t("no")}
      </ChoicePill>
    </div>
  );
}

function SingleChoiceField({
  special,
  value,
  onChange,
  disabled,
}: {
  special: SpecialDef;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const opts = (special.optionsJson as { values?: string[] } | null)?.values ?? [];
  const v = (value.value as string | undefined) ?? "";
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => {
        const active = v === o;
        return (
          <button
            key={o}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ value: active ? null : o })}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition disabled:opacity-50",
              active
                ? "border-[var(--color-arena)] bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:border-[var(--color-arena)]/50",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function NumberField({
  special,
  value,
  onChange,
  disabled,
}: {
  special: SpecialDef;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const t = useTranslations("predSpecials");
  const tolerance = (special.optionsJson as { tolerance?: number } | null)?.tolerance ?? 0;
  const v = value.value as number | null | undefined;
  const update = (n: number | null) => onChange({ value: n });
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || (v ?? 0) <= 0}
          onClick={() => update(Math.max(0, (v ?? 0) - 1))}
          className="grid size-10 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] font-display text-xl tracking-tight transition hover:border-[var(--color-arena)]/50 disabled:opacity-40"
          aria-label={t("subtract")}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={v ?? ""}
          onChange={(e) => update(e.target.value === "" ? null : Number(e.target.value))}
          disabled={disabled}
          placeholder="0"
          className="h-12 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-center font-display tabular text-3xl tracking-tight outline-none focus:border-[var(--color-arena)] disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => update((v ?? -1) + 1)}
          className="grid size-10 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] font-display text-xl tracking-tight transition hover:border-[var(--color-arena)]/50 disabled:opacity-40"
          aria-label={t("add")}
        >
          +
        </button>
      </div>
      {tolerance > 0 ? (
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {t("tolerance", { n: tolerance })}
        </p>
      ) : null}
    </div>
  );
}

function TeamRoundField({
  special,
  value,
  onChange,
  disabled,
  teams,
}: {
  special: SpecialDef;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  disabled: boolean;
  teams: { id: number; code: string; name: string }[];
}) {
  const t = useTranslations("predSpecials");
  const opts = special.optionsJson as { teamCodes?: string[]; rounds?: string[] } | null;
  const teamCode = (value.teamCode as string | undefined) ?? "";
  const round = (value.round as string | undefined) ?? "";
  const allowedTeams = useMemo(
    () => teams.filter((tm) => opts?.teamCodes?.includes(tm.code)),
    [teams, opts?.teamCodes],
  );
  const rounds = opts?.rounds ?? [];

  // Nuevo formato: {correct, exactRoundBonus}. Si está, mostramos los pts
  // inline (junto a "Selección" y "Hasta qué ronda") en vez del +X total
  // del footer.
  const cfg = special.pointsConfigJson as
    | { correct?: number; exactRoundBonus?: number }
    | { maxPoints?: number; perRound?: Record<string, number> }
    | null;
  const correctPts =
    cfg && "correct" in cfg && typeof cfg.correct === "number" ? cfg.correct : null;
  const bonusPts =
    cfg && "exactRoundBonus" in cfg && typeof cfg.exactRoundBonus === "number"
      ? cfg.exactRoundBonus
      : null;

  return (
    <div className="space-y-3">
      {/* Selecciones — fila scrollable de banderas */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
            {t("teamLabel")}
          </p>
          {correctPts != null ? <InlinePointsPill points={correctPts} /> : null}
        </div>
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 py-2"
          style={{ touchAction: "pan-x", overscrollBehaviorY: "contain" }}
        >
          {allowedTeams.map((tm) => {
            const active = teamCode === tm.code;
            return (
              <button
                key={tm.code}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, teamCode: active ? "" : tm.code })}
                title={tm.name}
                aria-label={tm.name}
                className={cn(
                  "block size-8 shrink-0 rounded-full transition disabled:opacity-50",
                  active
                    ? "ring-2 ring-[var(--color-arena)] ring-offset-2 ring-offset-[var(--color-surface)]"
                    : "opacity-90 hover:opacity-100",
                )}
              >
                <TeamFlag code={tm.code} size={32} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Rondas — pills */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
            {t("untilRound")}
          </p>
          {bonusPts != null ? <InlinePointsPill points={bonusPts} bonus /> : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {rounds.map((r) => {
            const active = round === r;
            return (
              <button
                key={r}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, round: active ? "" : r })}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] transition disabled:opacity-50",
                  active
                    ? "border-[var(--color-arena)] bg-[var(--color-arena)] text-white"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:border-[var(--color-arena)]/50",
                )}
              >
                {ROUND_LABEL_KEY[r] ? t(ROUND_LABEL_KEY[r]) : r}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InlinePointsPill({ points, bonus = false }: { points: number; bonus?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 font-display tabular text-[0.7rem] tracking-tight",
        bonus
          ? "bg-[color-mix(in_oklch,var(--color-arena)_15%,transparent)] text-[var(--color-arena)]"
          : "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]",
      )}
    >
      +{points}
      <span className="ml-0.5 text-[0.55rem] uppercase tracking-[0.18em] opacity-70">
        {points === 1 ? "pt" : "pts"}
      </span>
    </span>
  );
}

function PlayerField({
  special,
  value,
  onChange,
  disabled,
  players,
  teams,
}: {
  special: SpecialDef;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  disabled: boolean;
  players: { id: number; name: string; position: string | null; teamId: number }[];
  teams: { id: number; code: string; name: string }[];
}) {
  const t = useTranslations("predSpecials");
  const positionFilter = (special.optionsJson as { positionFilter?: string } | null)
    ?.positionFilter;
  const POSITION_FILTER_MAP: Record<string, string> = {
    GK: "POR",
    DF: "DEF",
    MF: "MED",
    FW: "DEL",
  };
  const normalizedFilter = positionFilter
    ? (POSITION_FILTER_MAP[positionFilter.toUpperCase()] ?? positionFilter)
    : undefined;
  // TODOS los candidatos (sin slice). El render se filtra por búsqueda
  // y el listado se limita visualmente a los primeros 30 hits para que
  // no se renderice una lista de cientos.
  const candidates = useMemo(
    () => (normalizedFilter ? players.filter((p) => p.position === normalizedFilter) : players),
    [players, normalizedFilter],
  );
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const v = value.playerId as number | undefined;
  const selectedPlayer = v ? players.find((p) => p.id === v) : null;
  const selectedTeam = selectedPlayer ? teamById.get(selectedPlayer.teamId) : null;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cerrar al click fuera.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return candidates.slice(0, 30);
    const q = query.toLowerCase();
    return candidates
      .filter((p) => {
        if (p.name.toLowerCase().includes(q)) return true;
        const tm = teamById.get(p.teamId);
        if (tm?.code.toLowerCase().includes(q)) return true;
        if (tm?.name.toLowerCase().includes(q)) return true;
        return false;
      })
      .slice(0, 30);
  }, [candidates, query, teamById]);

  if (selectedPlayer) {
    return (
      <div className="flex items-center justify-between rounded-md border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface-2))] px-3 py-2">
        <div className="flex items-center gap-2">
          <TeamFlag code={selectedTeam?.code} size={20} />
          <span className="font-display text-base tracking-tight">{selectedPlayer.name}</span>
          {selectedPlayer.position ? (
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {selectedPlayer.position}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ playerId: null })}
          aria-label={t("removePick")}
          className="text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        {t("noCandidatesLoaded")}
      </p>
    );
  }

  return (
    <div ref={wrapperRef} className="relative space-y-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("searchPlayerTeam")}
          className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] pl-8 pr-3 text-sm outline-none focus:border-[var(--color-arena)] disabled:opacity-50"
        />
      </div>
      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-elev-2)]">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
              {t("noMatches")}
            </p>
          ) : (
            <ul>
              {filtered.map((p) => {
                const tm = teamById.get(p.teamId);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({ playerId: p.id });
                        setQuery("");
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-2)]"
                    >
                      <TeamFlag code={tm?.code} size={16} />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        {tm?.code ?? ""}
                        {p.position ? ` · ${p.position}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!query && candidates.length > 30 ? (
            <p className="border-t border-[var(--color-border)] px-3 py-1.5 text-[0.65rem] text-[var(--color-muted-foreground)]">
              {t("showingOf", { n: candidates.length })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChoicePill({
  active,
  disabled,
  onClick,
  accent,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  accent: "success" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-md border px-4 py-3 font-display text-base tracking-tight transition disabled:opacity-50",
        active
          ? accent === "success"
            ? "border-[var(--color-success)] bg-[color-mix(in_oklch,var(--color-success)_18%,transparent)] text-[var(--color-success)]"
            : "border-[var(--color-danger)] bg-[color-mix(in_oklch,var(--color-danger)_15%,transparent)] text-[var(--color-danger)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:border-[var(--color-arena)]/50",
      )}
    >
      {children}
    </button>
  );
}
