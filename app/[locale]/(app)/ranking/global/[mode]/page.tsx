import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Globe2 } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/lib/auth/guards";
import { isPredictionMode, PREDICTION_MODES } from "@/lib/leagues";
import { loadGlobalLeaderboard } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import { GlobalStandings } from "./global-standings";

export const metadata = { title: "Ranking global" };
export const dynamic = "force-dynamic";

export default async function GlobalRankingPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const me = await requireUser();
  const t = await getTranslations("ranking");
  const tModes = await getTranslations("modes");
  const { mode: modeRaw } = await params;
  if (!isPredictionMode(modeRaw)) notFound();
  const mode = modeRaw;

  const ranked = await loadGlobalLeaderboard(mode);
  const myIndex = ranked.findIndex((r) => r.userId === me.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("globalEyebrow")}
        title={t("globalTitle", { mode: tModes(mode) })}
        description={t("globalDesc")}
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
              {tModes(m)}
            </Link>
          );
        })}
      </nav>

      {/* Mi posición — con paginación puede que mi fila no esté a la
          vista; este resumen la mantiene siempre presente. */}
      {myIndex >= 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] px-4 py-2.5">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
            {t("myPosition")}
          </span>
          <span className="flex items-baseline gap-3">
            <span className="font-display text-2xl tabular text-[var(--color-arena)] glow-arena">
              #{myIndex + 1}
            </span>
            <span className="font-display text-lg tabular">
              {ranked[myIndex]!.totalPoints}{" "}
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                {t("thPts")}
              </span>
            </span>
          </span>
        </div>
      ) : null}

      {ranked.length === 0 ? (
        <EmptyState
          icon={<Globe2 className="size-5" />}
          title={t("globalEmptyTitle")}
          description={t("globalEmptyDesc")}
        />
      ) : (
        <GlobalStandings entries={ranked} meId={me.id} />
      )}

      {myIndex < 0 ? (
        <p className="text-center font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          {t("notInRanking", { mode: tModes(mode) })}
        </p>
      ) : null}
    </div>
  );
}
