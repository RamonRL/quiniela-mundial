import { asc, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, teams } from "@/lib/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { ArticleForm } from "../article-form";

export const metadata = { title: "Nueva noticia · Admin" };

export default async function NewArticlePage() {
  const now = new Date();
  const [teamRows, matchRows] = await Promise.all([
    db
      .select({ code: teams.code, name: teams.name })
      .from(teams)
      .orderBy(asc(teams.name)),
    db
      .select({
        id: matches.id,
        code: matches.code,
        scheduledAt: matches.scheduledAt,
      })
      .from(matches)
      .where(gte(matches.scheduledAt, new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7)))
      .orderBy(asc(matches.scheduledAt))
      .limit(60),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Noticias · Admin"
        title="Nueva noticia"
        description="Redacta una noticia o pega contenido ya generado en Markdown. Las noticias publicadas aparecen en /noticias y se indexan automáticamente."
      />
      <ArticleForm
        teams={teamRows}
        upcomingMatches={matchRows.map((m) => ({
          id: m.id,
          label: `${m.code} · ${m.scheduledAt.toISOString().slice(0, 16).replace("T", " ")}`,
        }))}
      />
    </div>
  );
}
