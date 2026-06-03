import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Newspaper } from "lucide-react";
import { listPublishedNews } from "@/lib/news/queries";
import { NewsCard } from "@/components/news/news-card";

/**
 * Tira de últimas 2 noticias para el final del dashboard. Streamed via
 * Suspense desde page.tsx para no bloquear el critical path — el feed
 * de actividad ya hace el mismo patrón.
 */
export async function DashboardNewsStrip() {
  const items = await listPublishedNews({ limit: 2 });
  if (items.length === 0) return null;
  const t = await getTranslations("dashboard");

  return (
    <section className="rise-in space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="size-4 text-[var(--color-arena)]" />
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("nsHeader")}
          </p>
        </div>
        <Link
          href="/noticias"
          className="inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
        >
          {t("nsSeeAll")} <ArrowRight className="size-3" />
        </Link>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((n) => (
          <li key={n.id}>
            <NewsCard {...n} />
          </li>
        ))}
      </ul>
    </section>
  );
}
