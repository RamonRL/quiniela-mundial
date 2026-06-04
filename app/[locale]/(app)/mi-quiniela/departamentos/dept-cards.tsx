"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";

import type { DeptCardData } from "./dept-data";

export type { DeptCardData, DeptCardMember } from "./dept-data";

/** Color de fallback (arena) cuando el dept no tiene color propio. */
const FALLBACK = "#ef5043";
const PAGE_SIZE = 10;

/**
 * Grid de cards de departamento — la vista estrella del modo empresas.
 * Cada card respira el color del departamento (gradiente, acentos, chips),
 * muestra sus stats + top 5, y al clicar despliega un diálogo inmersivo con
 * el ranking completo paginado. `actions` permite al admin inyectar los
 * botones de editar/borrar sin acoplar este componente a la gestión.
 */
export function DeptCards({
  cards,
  actions,
}: {
  cards: DeptCardData[];
  actions?: (card: DeptCardData) => ReactNode;
}) {
  const t = useTranslations("departments");
  const [detail, setDetail] = useState<DeptCardData | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const accent = card.color ?? FALLBACK;
          const top5 = card.members.slice(0, 5);
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
              className="group relative cursor-pointer overflow-hidden rounded-2xl border bg-[var(--color-surface)] text-left shadow-[var(--shadow-elev-1)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elev-2)]"
              style={{ borderColor: `${accent}59` }}
            >
              {/* Cabecera bañada en el color del departamento */}
              <div
                className="relative p-5 pb-4"
                style={{
                  background: `linear-gradient(155deg, ${accent}40, ${accent}0d 55%, transparent)`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="grid size-14 shrink-0 place-items-center rounded-2xl text-3xl leading-none shadow-inner"
                    style={{
                      backgroundColor: `${accent}2e`,
                      border: `1px solid ${accent}66`,
                    }}
                  >
                    {card.emoji ?? "🏷️"}
                  </span>
                  {actions ? (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {actions(card)}
                    </div>
                  ) : null}
                </div>
                <h3 className="mt-3 truncate font-display text-2xl tracking-tight">
                  {card.name}
                </h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                  <Users className="size-3.5" />
                  {t("membersCount", { n: card.totalMembers })}
                  <span className="opacity-50">·</span>
                  {t("activeCount", { n: card.activeMembers })}
                </p>
              </div>

              {/* Stats */}
              <div
                className="grid grid-cols-2 divide-x border-t"
                style={{ borderColor: `${accent}33` }}
              >
                <div className="p-3.5" style={{ borderColor: `${accent}33` }}>
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                    {t("avgPoints")}
                  </p>
                  <p className="font-display tabular text-3xl" style={{ color: accent }}>
                    {card.avgPoints}
                  </p>
                </div>
                <div className="p-3.5" style={{ borderColor: `${accent}33` }}>
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                    {t("totalPoints")}
                  </p>
                  <p className="font-display tabular text-3xl">{card.totalPoints}</p>
                </div>
              </div>

              {/* Top 5 */}
              <div className="space-y-1.5 border-t p-4" style={{ borderColor: `${accent}33` }}>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                  {t("top5")}
                </p>
                {top5.length === 0 ? (
                  <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                    {t("noMembersYet")}
                  </p>
                ) : (
                  top5.map((m, i) => (
                    <div key={m.userId} className="flex items-center gap-2.5">
                      <span
                        className="grid size-5 shrink-0 place-items-center rounded-full font-mono text-[0.6rem] font-semibold"
                        style={
                          i === 0
                            ? { backgroundColor: accent, color: "#fff" }
                            : {
                                backgroundColor: `${accent}1f`,
                                color: "var(--color-muted-foreground)",
                              }
                        }
                      >
                        {i + 1}
                      </span>
                      <Avatar className="size-6 border border-[var(--color-border)]">
                        {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="text-[0.5rem]">
                          {initials(m.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                      <span className="font-display tabular text-sm">{m.points}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer CTA */}
              <div
                className="flex items-center justify-end gap-1.5 border-t px-4 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] transition group-hover:text-[var(--color-foreground)]"
                style={{ borderColor: `${accent}33` }}
              >
                {t("viewDetail")}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          );
        })}
      </div>

      {detail ? (
        <DeptDetailDialog card={detail} onClose={() => setDetail(null)} />
      ) : null}
    </>
  );
}

/** Diálogo inmersivo: cabecera con el color del dept + ranking completo
 *  paginado. Exportado: lo reutiliza el ranking de departamentos. */
export function DeptDetailDialog({
  card,
  onClose,
}: {
  card: DeptCardData;
  onClose: () => void;
}) {
  const t = useTranslations("departments");
  const [page, setPage] = useState(1);
  const accent = card.color ?? FALLBACK;
  const totalPages = Math.max(1, Math.ceil(card.members.length / PAGE_SIZE));
  const items = card.members.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        {/* Cabecera de color */}
        <div
          className="p-6 pb-5"
          style={{
            background: `linear-gradient(150deg, ${accent}4d, ${accent}14 60%, transparent)`,
          }}
        >
          <DialogHeader>
            <div className="flex items-center gap-4">
              <span
                className="grid size-14 shrink-0 place-items-center rounded-2xl text-3xl leading-none"
                style={{ backgroundColor: `${accent}2e`, border: `1px solid ${accent}66` }}
              >
                {card.emoji ?? "🏷️"}
              </span>
              <div className="min-w-0">
                <DialogTitle className="truncate font-display text-2xl tracking-tight">
                  {card.name}
                </DialogTitle>
                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  {t("membersCount", { n: card.totalMembers })}
                  <span className="mx-1.5 opacity-50">·</span>
                  {t("avgPoints")}{" "}
                  <span className="font-semibold" style={{ color: accent }}>
                    {card.avgPoints}
                  </span>
                  <span className="mx-1.5 opacity-50">·</span>
                  {t("totalPoints")} <span className="font-semibold">{card.totalPoints}</span>
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Ranking completo paginado */}
        <div className="px-6 pb-6">
          <p className="pb-2 font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
            {t("detailRanking")}
          </p>
          {card.members.length === 0 ? (
            <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              {t("noMembersYet")}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
              {items.map((m, i) => {
                const rank = (page - 1) * PAGE_SIZE + i + 1;
                return (
                  <div
                    key={m.userId}
                    className="flex items-center gap-3 border-b border-[var(--color-border)] px-3 py-2 last:border-b-0"
                  >
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-full font-mono text-[0.62rem] font-semibold"
                      style={
                        rank === 1
                          ? { backgroundColor: accent, color: "#fff" }
                          : {
                              backgroundColor: `${accent}1f`,
                              color: "var(--color-muted-foreground)",
                            }
                      }
                    >
                      {rank}
                    </span>
                    <Avatar className="size-7 border border-[var(--color-border)]">
                      {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="text-[0.55rem]">
                        {initials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                    <span className="font-display tabular text-base">{m.points}</span>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="size-4" />
                {t("prev")}
              </Button>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                {t("pageOf", { page, total: totalPages })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("next")}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
