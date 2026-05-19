import Image from "next/image";
import Link from "next/link";
import { NEWS_CATEGORIES, type NewsCategoryKey } from "@/lib/news/categories";
import { formatDateTime } from "@/lib/utils";

const toneClass: Record<string, string> = {
  arena:
    "bg-[color-mix(in_oklch,var(--color-arena)_14%,var(--color-surface))] text-[var(--color-arena)] border-[var(--color-arena)]/30",
  pitch:
    "bg-[color-mix(in_oklch,var(--color-pitch)_14%,var(--color-surface))] text-[var(--color-pitch-deep,var(--color-pitch))] border-[var(--color-pitch)]/30",
  amber:
    "bg-[color-mix(in_oklch,var(--color-amber)_18%,var(--color-surface))] text-[var(--color-ink)] border-[var(--color-amber)]/40",
  ink: "bg-[var(--color-surface-2)] text-[var(--color-ink)] border-[var(--color-border-strong)]",
};

export type NewsCardProps = {
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  coverAlt: string | null;
  category: NewsCategoryKey;
  publishedAt: Date;
  variant?: "default" | "compact" | "hero";
};

export function NewsCard({
  slug,
  title,
  excerpt,
  coverUrl,
  coverAlt,
  category,
  publishedAt,
  variant = "default",
}: NewsCardProps) {
  const cat = NEWS_CATEGORIES[category];
  const href = `/noticias/${slug}`;
  const dateLabel = formatDateTime(publishedAt, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (variant === "compact") {
    return (
      <article className="group relative flex items-start gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0">
        <Link href={href} className="absolute inset-0" aria-label={title} />
        {coverUrl ? (
          <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <Image
              src={coverUrl}
              alt={coverAlt ?? title}
              fill
              sizes="64px"
              className="object-cover transition group-hover:scale-105"
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <CategoryBadge tone={cat.tone} label={cat.label} />
          <h3 className="line-clamp-2 font-display text-sm leading-snug tracking-tight">
            {title}
          </h3>
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
            {dateLabel}
          </p>
        </div>
      </article>
    );
  }

  if (variant === "hero") {
    return (
      <article className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[var(--color-arena)]/40 hover:shadow-[var(--shadow-elev-1)]">
        <Link href={href} className="absolute inset-0 z-10" aria-label={title} />
        <div className="grid gap-0 sm:grid-cols-[1.2fr_1fr]">
          {coverUrl ? (
            <div className="relative aspect-[16/10] sm:aspect-auto">
              <Image
                src={coverUrl}
                alt={coverAlt ?? title}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                priority
                className="object-cover transition group-hover:scale-[1.02]"
              />
            </div>
          ) : null}
          <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
            <CategoryBadge tone={cat.tone} label={cat.label} />
            <h2 className="font-display text-3xl leading-[1.05] tracking-tight sm:text-4xl">
              {title}
            </h2>
            <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
              {excerpt}
            </p>
            <p className="pt-1 font-mono text-[0.6rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              {dateLabel}
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:-translate-y-0.5 hover:border-[var(--color-arena)]/40 hover:shadow-[var(--shadow-elev-1)]">
      <Link href={href} className="absolute inset-0 z-10" aria-label={title} />
      {coverUrl ? (
        <div className="relative aspect-[16/9]">
          <Image
            src={coverUrl}
            alt={coverAlt ?? title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-[var(--color-surface-2)]" />
      )}
      <div className="flex flex-col gap-2.5 p-5">
        <CategoryBadge tone={cat.tone} label={cat.label} />
        <h3 className="font-display text-xl leading-tight tracking-tight">
          {title}
        </h3>
        <p className="line-clamp-3 font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
          {excerpt}
        </p>
        <p className="pt-1 font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
          {dateLabel}
        </p>
      </div>
    </article>
  );
}

export function CategoryBadge({ tone, label }: { tone: string; label: string }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.24em] ${toneClass[tone] ?? toneClass.ink}`}
    >
      {label}
    </span>
  );
}
