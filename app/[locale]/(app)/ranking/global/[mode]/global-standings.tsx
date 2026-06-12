"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TablePagination } from "@/components/ranking/table-pagination";
import { cn, initials } from "@/lib/utils";

const PAGE_SIZE = 10;

export type GlobalStandingsEntry = {
  userId: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  totalPoints: number;
};

/** Ranking global paginado de 10 en 10 — los públicos pueden ser cientos. */
export function GlobalStandings({
  entries,
  meId,
  leagueId,
}: {
  entries: GlobalStandingsEntry[];
  meId: string;
  /** Liga pública de este modo — el perfil se abre en su contexto (?league). */
  leagueId: number | null;
}) {
  const t = useTranslations("ranking");
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const items = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <ul className="divide-y divide-[var(--color-border)]">
          {items.map((r, i) => {
            const display = r.nickname || r.email.split("@")[0];
            const isMe = r.userId === meId;
            const pos = (page - 1) * PAGE_SIZE + i + 1;
            const href = leagueId != null ? `/ranking/${r.userId}?league=${leagueId}` : `/ranking/${r.userId}`;
            return (
              <li key={r.userId}>
                <Link
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-2.5 outline-none transition hover:bg-[var(--color-surface-2)] focus-visible:bg-[var(--color-surface-2)]",
                    isMe ? "bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)]" : "",
                  )}
                >
                  <span
                    className={cn(
                      "w-6 text-center font-display tabular text-base",
                      pos <= 3 ? "text-[var(--color-arena)] glow-arena" : "text-[var(--color-muted-foreground)]",
                    )}
                  >
                    {pos}
                  </span>
                  <Avatar className="size-8 border border-[var(--color-border)]">
                    {r.avatarUrl ? <AvatarImage src={r.avatarUrl} alt="" /> : null}
                    <AvatarFallback className="text-[0.6rem]">{initials(display)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium transition-colors group-hover:text-[var(--color-arena)]">
                    {display}
                    {isMe ? (
                      <span className="ml-1.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
                        {t("youLower")}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-display tabular text-base">{r.totalPoints}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
