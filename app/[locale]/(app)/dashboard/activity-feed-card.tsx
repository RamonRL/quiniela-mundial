import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Coins } from "lucide-react";
import { loadActivityFeed } from "@/lib/activity-feed";
import { CATEGORY_META } from "@/components/scoring/category-style";
import { ActivityDetail } from "@/components/dashboard/activity-detail";

/**
 * Panel "Últimos puntos · tu ledger" — columna vertical (comparte fila con el
 * Top 5 en el dashboard). Server Component bajo <Suspense>: streamea su HTML
 * cuando estén sus queries, sin bloquear el shell del dashboard.
 */
export async function ActivityFeedCard({
  userId,
  leagueId,
}: {
  userId: string;
  leagueId: number;
}) {
  const tLedger = await getTranslations("ledger");
  const activity = await loadActivityFeed(userId, leagueId, 5, tLedger).catch(() => []);
  const t = await getTranslations("dashboard");

  return (
    <div className="rise-in relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" />
      <header className="relative flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-[var(--color-arena)]" />
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-foreground)]">
            {t("afHeader")}
          </p>
        </div>
      </header>
      <div className="relative flex-1 p-3">
        {activity.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="grid size-12 place-items-center rounded-full border border-dashed border-[var(--color-border-strong)] text-[var(--color-muted-foreground)]">
              <Coins className="size-5" />
            </span>
            <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              {t("afEmpty")}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {activity.map((a) => {
              const meta = a.category ? CATEGORY_META[a.category] : null;
              const Icon = meta?.Icon ?? Coins;
              const color = meta?.color ?? "var(--color-arena)";
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Icon className="size-4 shrink-0" style={{ color }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.label}</p>
                      <ActivityDetail match={a.match} detail={a.detail} />
                    </div>
                  </div>
                  <span
                    className="glow-cat font-display tabular text-2xl leading-none"
                    style={{ color }}
                  >
                    +{a.points}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {activity.length > 0 ? (
        <Link
          href={`/ranking/${userId}`}
          className="group relative flex items-center justify-center gap-1.5 border-t border-[var(--color-border)] px-5 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
        >
          {t("afViewAll")}
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
