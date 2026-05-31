import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/lib/auth/guards";
import { isPredictionMode, PREDICTION_MODES, PREDICTION_MODE_META } from "@/lib/leagues";
import { loadGlobalLeaderboard } from "@/lib/leaderboard";
import { cn, initials } from "@/lib/utils";

export const metadata = { title: "Ranking global" };
export const dynamic = "force-dynamic";

export default async function GlobalRankingPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const me = await requireUser();
  const { mode: modeRaw } = await params;
  if (!isPredictionMode(modeRaw)) notFound();
  const mode = modeRaw;

  const ranked = await loadGlobalLeaderboard(mode);
  const myIndex = ranked.findIndex((r) => r.userId === me.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ranking global"
        title={`Mundial · ${PREDICTION_MODE_META[mode].label}`}
        description="Tu mejor liga de este modo compite aquí — públicas y privadas juntas."
      />

      {/* Tabs por modo */}
      <nav className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {PREDICTION_MODES.map((m) => {
          const active = m === mode;
          return (
            <Link
              key={m}
              href={`/ranking/global/${m}`}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]",
              )}
            >
              <Globe2 className="size-3.5" />
              {PREDICTION_MODE_META[m].label}
            </Link>
          );
        })}
      </nav>

      {ranked.length === 0 ? (
        <EmptyState
          icon={<Globe2 className="size-5" />}
          title="Sin participantes aún"
          description="Nadie ha puntuado todavía en este modo. Sé el primero."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <ul className="divide-y divide-[var(--color-border)]">
            {ranked.map((r, i) => {
              const display = r.nickname || r.email.split("@")[0];
              const isMe = r.userId === me.id;
              const pos = i + 1;
              return (
                <li
                  key={r.userId}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5",
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
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {display}
                    {isMe ? (
                      <span className="ml-1.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
                        tú
                      </span>
                    ) : null}
                  </span>
                  <span className="font-display tabular text-base">{r.totalPoints}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {myIndex < 0 ? (
        <p className="text-center font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          Aún no apareces en este ranking — únete a una quiniela de modo{" "}
          {PREDICTION_MODE_META[mode].label} y empieza a predecir.
        </p>
      ) : null}
    </div>
  );
}
