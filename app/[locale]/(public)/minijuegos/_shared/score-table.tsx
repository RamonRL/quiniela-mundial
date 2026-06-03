import { Award, Crown, Medal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

export type MinigameScoreRow = {
  identityKey: string;
  displayName: string;
  bestScore: number;
  isGuest: boolean;
  /** Avatar/escudo del usuario logueado. Null para invitados. */
  avatarUrl: string | null;
};

type Props = {
  rows: MinigameScoreRow[];
  /** identityKey de la persona logueada o del propio invitado (para marcar "Tú"). */
  highlightIdentityKey?: string | null;
  /** Texto de empty state si rows está vacío. */
  emptyMessage?: string;
};

/**
 * Ranking compartido entre minijuegos. Mismo lenguaje visual que
 * `/ranking` (podium + tabla) pero sin métricas secundarias: aquí solo
 * importa la mejor puntuación, así que la columna de Pts manda la jerarquía.
 */
export function MinigameScoreTable({
  rows,
  highlightIdentityKey,
  emptyMessage,
}: Props) {
  const t = useTranslations("minigames");
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/60 px-6 py-10 text-center">
        <p className="font-editorial italic text-[var(--color-muted-foreground)]">
          {emptyMessage ?? t("emptyDefault")}
        </p>
      </div>
    );
  }

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="space-y-6">
      <section className="grid items-end gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => {
          const position = i + 1;
          const entry = top3[i];
          if (!entry) {
            return (
              <div
                key={`empty-${position}`}
                className={cn(
                  "rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50",
                  position === 1
                    ? "h-48 sm:order-2"
                    : position === 2
                      ? "h-40 sm:order-1"
                      : "h-36 sm:order-3",
                )}
              />
            );
          }
          return (
            <PodiumCard
              key={entry.identityKey}
              position={position}
              entry={entry}
              isMe={entry.identityKey === highlightIdentityKey}
            />
          );
        })}
      </section>

      {rest.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-px w-6 bg-[var(--color-arena)]" />
            <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {t("positionsRest")}
            </h2>
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="grid grid-cols-[56px_1fr_72px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
              <span>{t("thPos")}</span>
              <span>{t("thPlayer")}</span>
              <span className="text-right">{t("thPts")}</span>
            </div>
            <ul>
              {rest.map((r, i) => {
                const position = i + 4;
                const isMe = r.identityKey === highlightIdentityKey;
                return (
                  <li
                    key={r.identityKey}
                    className={cn(
                      "grid grid-cols-[56px_1fr_72px] items-center gap-2 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0 transition",
                      isMe
                        ? "bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)]"
                        : "",
                    )}
                  >
                    <span className="font-display text-2xl tabular text-[var(--color-muted-foreground)]">
                      {position.toString().padStart(2, "0")}
                    </span>
                    <span className="flex items-center gap-3 truncate">
                      <Avatar className="size-8 border border-[var(--color-border)]">
                        {r.avatarUrl ? <AvatarImage src={r.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="font-mono text-[0.65rem] uppercase tracking-tight text-[var(--color-muted-foreground)]">
                          {initials(r.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-medium">{r.displayName}</span>
                      {isMe ? (
                        <span className="rounded bg-[var(--color-arena)] px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white">
                          {t("you")}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-right font-display text-xl tabular">
                      {r.bestScore}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

const PODIUM_LAYOUT: Record<
  number,
  {
    order: string;
    height: string;
    border: string;
    accent: string;
    icon: typeof Crown;
    iconClass: string;
    ring: string;
    labelKey: string;
  }
> = {
  1: {
    order: "sm:order-2",
    height: "sm:min-h-[22rem]",
    border:
      "border-[var(--color-arena)]/60 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))]",
    accent: "text-[var(--color-arena)] glow-arena",
    icon: Crown,
    iconClass: "text-[var(--color-arena)]",
    ring: "ring-4 ring-[var(--color-arena)]",
    labelKey: "gold",
  },
  2: {
    order: "sm:order-1",
    height: "sm:min-h-[19rem]",
    border:
      "border-[var(--color-border-strong)] bg-[color-mix(in_oklch,var(--color-foreground)_3%,var(--color-surface))]",
    accent: "text-[var(--color-foreground)]",
    icon: Medal,
    iconClass: "text-[var(--color-foreground)]/70",
    ring: "ring-2 ring-[var(--color-border-strong)]",
    labelKey: "silver",
  },
  3: {
    order: "sm:order-3",
    height: "sm:min-h-[17.5rem]",
    border: "border-[var(--color-border)] bg-[var(--color-surface)]",
    accent: "text-[color-mix(in_oklch,var(--color-arena)_50%,var(--color-muted-foreground))]",
    icon: Award,
    iconClass:
      "text-[color-mix(in_oklch,var(--color-arena)_50%,var(--color-muted-foreground))]",
    ring: "ring-2 ring-[color-mix(in_oklch,var(--color-arena)_40%,var(--color-border-strong))]",
    labelKey: "bronze",
  },
};

function PodiumCard({
  position,
  entry,
  isMe,
}: {
  position: number;
  entry: MinigameScoreRow;
  isMe: boolean;
}) {
  const t = useTranslations("minigames");
  const layout = PODIUM_LAYOUT[position]!;
  const Icon = layout.icon;
  const avatarSize =
    position === 1 ? "size-24 sm:size-28" : position === 2 ? "size-20 sm:size-24" : "size-16 sm:size-20";
  const positionSize =
    position === 1 ? "text-6xl sm:text-7xl" : "text-5xl sm:text-6xl";
  const nameSize = position === 1 ? "text-xl sm:text-2xl" : "text-lg sm:text-xl";
  const pointsSize = position === 1 ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl";

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border p-5",
        layout.order,
        layout.height,
        layout.border,
        isMe ? "ring-2 ring-[var(--color-arena)]/40 ring-offset-2 ring-offset-[var(--color-bg)]" : "",
      )}
    >
      <span
        className={cn("relative font-display leading-none tabular", positionSize, layout.accent)}
      >
        {position}
      </span>

      <div className="absolute right-4 top-4 flex flex-col items-end gap-1">
        <Icon className={cn("size-6", layout.iconClass)} />
        <span
          className={cn(
            "font-mono text-[0.55rem] uppercase tracking-[0.28em]",
            layout.iconClass,
          )}
        >
          {t(layout.labelKey)}
        </span>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-3 py-3">
        <Avatar
          className={cn(
            "border-2 border-[var(--color-border-strong)]",
            avatarSize,
            layout.ring,
          )}
        >
          {entry.avatarUrl ? <AvatarImage src={entry.avatarUrl} alt="" /> : null}
          <AvatarFallback className="font-display text-3xl tracking-tight">
            {initials(entry.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="px-2 text-center">
          <p className={cn("truncate font-display tracking-tight", nameSize)}>
            {entry.displayName}
          </p>
          {isMe ? (
            <p className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
              {t("you")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative flex items-end justify-between gap-2 border-t border-dashed border-[var(--color-border)] pt-3">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
          {t("best")}
        </p>
        <p
          className={cn(
            "font-display tabular tracking-tight",
            pointsSize,
            layout.accent,
          )}
        >
          {entry.bestScore}
        </p>
      </div>
    </div>
  );
}
