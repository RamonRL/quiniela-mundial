import { TeamFlag } from "@/components/brand/team-flag";

/**
 * Subtexto de una entrada del ledger ("Aciertos recientes" / "Tu ledger").
 * Si la entrada hace referencia a un partido, pinta las dos banderas con sus
 * códigos; si además hay un extra (goleador), lo añade. Si no hay partido,
 * muestra el `detail` o, en su defecto, el `fallback` (p. ej. la fecha).
 */
export function ActivityDetail({
  match,
  detail,
  fallback,
}: {
  match: { homeCode: string | null; awayCode: string | null } | null;
  detail: string | null;
  fallback?: string;
}) {
  const cls =
    "flex items-center gap-1 truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]";

  if (match) {
    return (
      <p className={cls}>
        <TeamFlag code={match.homeCode} size={14} className="shrink-0" />
        <span>{match.homeCode ?? "?"}</span>
        <span className="opacity-60">vs</span>
        <TeamFlag code={match.awayCode} size={14} className="shrink-0" />
        <span>{match.awayCode ?? "?"}</span>
        {detail ? <span className="truncate">· {detail}</span> : null}
      </p>
    );
  }
  if (detail) return <p className={cls}>{detail}</p>;
  if (fallback) return <p className={cls}>{fallback}</p>;
  return null;
}
