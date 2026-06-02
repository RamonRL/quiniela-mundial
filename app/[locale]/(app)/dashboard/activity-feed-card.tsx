import { loadActivityFeed } from "@/lib/activity-feed";

/**
 * Server Component que carga el activity feed por su cuenta. Se monta en
 * el dashboard envuelto en `<Suspense>` para que el shell de la página
 * (HUD live, hero, progress hub) renderice de inmediato y este panel
 * llegue por streaming cuando estén sus queries — eso descongestiona el
 * `Promise.all` crítico del dashboard.
 */
export async function ActivityFeedCard({
  userId,
  leagueId,
  myPoints,
}: {
  userId: string;
  leagueId: number;
  myPoints: number;
}) {
  if (myPoints <= 0) return null;
  const activity = await loadActivityFeed(userId, leagueId, 8).catch(() => []);
  if (activity.length === 0) return null;

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <header className="flex items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Últimos puntos · tu ledger
          </p>
        </div>
        <p className="font-display text-xl tracking-tight">+{myPoints}</p>
      </header>
      <ul className="grid gap-2 sm:grid-cols-2">
        {activity.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{a.label}</p>
              {a.detail ? (
                <p className="truncate font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                  {a.detail}
                </p>
              ) : null}
            </div>
            <span className="font-display tabular text-2xl text-[var(--color-arena)] glow-arena">
              +{a.points}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
