"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Award, Crown, Medal, Users } from "lucide-react";
import {
  DeptDetailDialog,
  type DeptCardData,
} from "@/app/[locale]/(app)/mi-quiniela/departamentos/dept-cards";

const FALLBACK = "#ef5043";

/**
 * Ranking de departamentos al nivel de las nuevas cards: podio top-3 bañado en
 * el color de cada equipo + filas del resto con su acento. TODO clicable →
 * mismo diálogo inmersivo (ranking interno completo paginado).
 * `cards` llega YA ordenado por la métrica del ranking (media sobre activos).
 */
export function DeptRankingBoard({ cards }: { cards: DeptCardData[] }) {
  const t = useTranslations("ranking");
  const td = useTranslations("departments");
  const [detail, setDetail] = useState<DeptCardData | null>(null);

  const top3 = cards.slice(0, 3);
  const rest = cards.slice(3);

  const podium = (position: 1 | 2 | 3) =>
    ({
      1: { order: "sm:order-2", height: "sm:min-h-52", icon: Crown, labelKey: "gold" },
      2: { order: "sm:order-1", height: "sm:min-h-44", icon: Medal, labelKey: "silver" },
      3: { order: "sm:order-3", height: "sm:min-h-40", icon: Award, labelKey: "bronze" },
    })[position];

  return (
    <>
      {/* ── Podio top 3 ── */}
      <section className="grid items-end gap-3 sm:grid-cols-3">
        {top3.map((card, i) => {
          const position = (i + 1) as 1 | 2 | 3;
          const layout = podium(position);
          const Icon = layout.icon;
          const accent = card.color ?? FALLBACK;
          return (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetail(card)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDetail(card);
                }
              }}
              className={`group relative flex cursor-pointer flex-col justify-between gap-3 overflow-hidden rounded-2xl border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-elev-1)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elev-2)] ${layout.order} ${layout.height}`}
              style={{
                borderColor: `${accent}66`,
                background: `linear-gradient(165deg, ${accent}3d, ${accent}0d 55%, var(--color-surface))`,
              }}
            >
              <div className="flex items-center justify-between">
                <Icon className="size-4" style={{ color: accent }} />
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.16em]"
                  style={
                    position === 1
                      ? { backgroundColor: accent, color: "#fff" }
                      : { backgroundColor: `${accent}26`, color: "var(--color-foreground)" }
                  }
                >
                  #{position} · {t(layout.labelKey)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl leading-none"
                  style={{ backgroundColor: `${accent}2e`, border: `1px solid ${accent}66` }}
                >
                  {card.emoji ?? "🏷️"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-xl leading-tight tracking-tight">
                    {card.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    {t("deptStats", {
                      active: card.activeMembers,
                      exact: card.exactScoresCount,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                  {t("avg")}
                </span>
                <span className="font-display tabular text-4xl" style={{ color: accent }}>
                  {card.avgPoints}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Resto de posiciones ── */}
      {rest.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-px w-6 bg-[var(--color-arena)]" />
            <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {t("positionsRest")}
            </h2>
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <div className="space-y-2">
            {rest.map((card, i) => {
              const position = i + 4;
              const accent = card.color ?? FALLBACK;
              return (
                <div
                  key={card.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetail(card)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDetail(card);
                    }
                  }}
                  className="group flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl border bg-[var(--color-surface)] px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elev-1)]"
                  style={{
                    borderColor: `${accent}4d`,
                    borderLeft: `4px solid ${accent}`,
                  }}
                >
                  <span className="w-9 shrink-0 font-display tabular text-2xl text-[var(--color-muted-foreground)]">
                    {position.toString().padStart(2, "0")}
                  </span>
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-lg leading-none"
                    style={{ backgroundColor: `${accent}26`, border: `1px solid ${accent}59` }}
                  >
                    {card.emoji ?? "🏷️"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{card.name}</p>
                    <p className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                      <Users className="size-3" />
                      {td("activeCount", { n: card.activeMembers })} /{" "}
                      {td("membersCount", { n: card.totalMembers })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {t("avg")}
                    </p>
                    <p className="font-display tabular text-2xl" style={{ color: accent }}>
                      {card.avgPoints}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {detail ? <DeptDetailDialog card={detail} onClose={() => setDetail(null)} /> : null}
    </>
  );
}
