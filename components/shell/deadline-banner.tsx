import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import type { PendingDeadline } from "@/lib/deadlines";
import { formatRemaining } from "@/lib/deadlines";

export function DeadlineBanner({ deadline }: { deadline: PendingDeadline | null }) {
  const t = useTranslations("shellExtra");
  if (!deadline) return null;
  const remaining = formatRemaining(deadline.msRemaining);
  const urgent = deadline.msRemaining < 60 * 60 * 1000;
  return (
    <Link
      href={deadline.href}
      className={`group relative flex items-center gap-3 overflow-hidden border-b px-4 py-2 transition lg:px-8 ${
        urgent
          ? "border-[var(--color-arena)]/60 bg-[color-mix(in_oklch,var(--color-arena)_14%,var(--color-bg))] text-[var(--color-foreground)]"
          : "border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-bg))] text-[var(--color-foreground)]"
      }`}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
        <Clock className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
          {t("closesIn", { remaining })}
        </p>
        <p className="truncate text-sm font-semibold">
          {t.rich("predictionOf", {
            label: deadline.label,
            s: (chunks) => <span className="font-display text-base">{chunks}</span>,
          })}
          {deadline.missing > 1 ? (
            <span className="ml-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              {t("unsent", { n: deadline.missing })}
            </span>
          ) : null}
        </p>
      </div>
      <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] group-hover:text-[var(--color-arena)]">
        {t("go")}
      </span>
    </Link>
  );
}
