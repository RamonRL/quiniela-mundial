import { cn } from "@/lib/utils";

type Props = {
  title: string;
  eyebrow?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, eyebrow, description, actions, className }: Props) {
  return (
    <header
      className={cn(
        "relative flex flex-col gap-5 border-b border-[var(--color-border)] pb-8 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-3">
        {eyebrow ? (
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-[var(--color-arena)]" />
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {eyebrow}
            </p>
          </div>
        ) : null}
        <h1 className="font-display text-5xl leading-[0.92] tracking-tight sm:text-6xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-4xl font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-lg">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-px left-0 h-px w-24 bg-[var(--color-arena)]"
      />
    </header>
  );
}
