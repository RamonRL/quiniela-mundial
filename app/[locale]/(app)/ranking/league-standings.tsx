"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/ranking/table-pagination";
import { initials } from "@/lib/utils";

const PAGE_SIZE = 10;

export type StandingsEntry = {
  userId: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  exactScoresCount: number;
  knockoutPoints: number;
};

/**
 * Tabla de posiciones completa de la liga — incluye TAMBIÉN al podio (que
 * además luce arriba en sus tarjetas) para que la clasificación se lea de
 * un vistazo del 1 al último. Paginada de 10 en 10.
 */
export function LeagueStandings({
  entries,
  meId,
}: {
  entries: StandingsEntry[];
  meId: string;
}) {
  const t = useTranslations("ranking");
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const items = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px w-6 bg-[var(--color-arena)]" />
        <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {t("standingsAll")}
        </h2>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid grid-cols-[56px_1fr_72px_56px_56px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] sm:grid-cols-[56px_1fr_72px_64px_64px]">
          <span>{t("thPos")}</span>
          <span>{t("thParticipant")}</span>
          <span className="text-right">{t("thPts")}</span>
          <span className="hidden text-right sm:inline">{t("thExact")}</span>
          <span className="hidden text-right sm:inline">{t("thKO")}</span>
        </div>
        <ul>
          {items.map((r, i) => {
            const position = (page - 1) * PAGE_SIZE + i + 1;
            const isMe = r.userId === meId;
            const display = r.nickname || r.email.split("@")[0];
            return (
              <li key={r.userId}>
                <Link
                  href={`/ranking/${r.userId}`}
                  className={`grid grid-cols-[56px_1fr_72px] items-center gap-2 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0 transition hover:bg-[var(--color-surface-2)] sm:grid-cols-[56px_1fr_72px_64px_64px] ${
                    isMe
                      ? "bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)]"
                      : ""
                  }`}
                >
                  <span
                    className={`font-display text-2xl tabular ${
                      position <= 3
                        ? "text-[var(--color-arena)] glow-arena"
                        : "text-[var(--color-muted-foreground)]"
                    }`}
                  >
                    {position.toString().padStart(2, "0")}
                  </span>
                  <span className="flex items-center gap-3 truncate">
                    <Avatar className="size-8 border border-[var(--color-border)]">
                      {r.avatarUrl ? <AvatarImage src={r.avatarUrl} alt="" /> : null}
                      <AvatarFallback>{initials(display)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">{display}</span>
                    {isMe ? (
                      <Badge variant="default" className="ml-1">
                        {t("you")}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="text-right font-display tabular text-xl">
                    {r.totalPoints}
                  </span>
                  <span className="hidden text-right text-sm tabular text-[var(--color-muted-foreground)] sm:inline">
                    {r.exactScoresCount}
                  </span>
                  <span className="hidden text-right text-sm tabular text-[var(--color-muted-foreground)] sm:inline">
                    {r.knockoutPoints}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}
