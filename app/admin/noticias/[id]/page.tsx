import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, gte } from "drizzle-orm";
import { ExternalLink, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { matches, newsArticles, teams } from "@/lib/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ArticleForm } from "../article-form";
import { deleteArticle } from "../actions";

export const metadata = { title: "Editar noticia · Admin" };

type Params = Promise<{ id: string }>;

export default async function EditArticlePage({ params }: { params: Params }) {
  const { id } = await params;
  const articleId = Number.parseInt(id, 10);
  if (!Number.isFinite(articleId)) notFound();

  const [article] = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.id, articleId))
    .limit(1);
  if (!article) notFound();

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
      .where(gte(matches.scheduledAt, new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30)))
      .orderBy(asc(matches.scheduledAt))
      .limit(120),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Noticias · Admin"
        title={article.title}
        description={`Edita el artículo /${article.slug}. Los cambios se publican al guardar (revalidación automática).`}
        actions={
          <div className="flex items-center gap-2">
            {article.status === "published" ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/noticias/${article.slug}`} target="_blank">
                  <ExternalLink className="size-3.5" />
                  Ver en vivo
                </Link>
              </Button>
            ) : null}
            <form action={deleteArticle}>
              <input type="hidden" name="id" value={article.id} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
              >
                <Trash2 className="size-3.5" />
                Eliminar
              </Button>
            </form>
          </div>
        }
      />
      <ArticleForm
        article={{
          id: article.id,
          slug: article.slug,
          title: article.title,
          seoTitle: article.seoTitle,
          excerpt: article.excerpt,
          body: article.body,
          coverUrl: article.coverUrl,
          coverAlt: article.coverAlt,
          category: article.category,
          tags: article.tags,
          relatedTeamCodes: article.relatedTeamCodes,
          relatedMatchId: article.relatedMatchId,
          status: article.status,
          publishedAt: article.publishedAt,
        }}
        teams={teamRows}
        upcomingMatches={matchRows.map((m) => ({
          id: m.id,
          label: `${m.code} · ${m.scheduledAt.toISOString().slice(0, 16).replace("T", " ")}`,
        }))}
      />
    </div>
  );
}
