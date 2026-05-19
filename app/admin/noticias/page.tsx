import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { newsArticles, profiles } from "@/lib/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryBadge } from "@/components/news/news-card";
import { NEWS_CATEGORIES } from "@/lib/news/categories";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Noticias · Admin" };

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "outline" }
> = {
  draft: { label: "Borrador", variant: "outline" },
  scheduled: { label: "Programado", variant: "warning" },
  published: { label: "Publicado", variant: "success" },
  archived: { label: "Archivado", variant: "default" },
};

export default async function AdminNewsListPage() {
  const articles = await db
    .select({
      id: newsArticles.id,
      slug: newsArticles.slug,
      title: newsArticles.title,
      category: newsArticles.category,
      status: newsArticles.status,
      publishedAt: newsArticles.publishedAt,
      updatedAt: newsArticles.updatedAt,
      coverUrl: newsArticles.coverUrl,
      authorNickname: profiles.nickname,
      viewCount: newsArticles.viewCount,
    })
    .from(newsArticles)
    .leftJoin(profiles, eq(profiles.id, newsArticles.authorId))
    .orderBy(desc(newsArticles.updatedAt));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Noticias"
        description="Gestiona convocatorias, previas, crónicas y análisis. Los artículos publicados aparecen en /noticias y se indexan automáticamente en el sitemap + Google News."
        actions={
          <Button asChild>
            <Link href="/admin/noticias/nuevo">
              <Plus className="size-4" />
              Nueva noticia
            </Link>
          </Button>
        }
      />

      {articles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-editorial italic text-[var(--color-muted-foreground)]">
              Aún no has creado ninguna noticia.
            </p>
            <Button asChild className="mt-4">
              <Link href="/admin/noticias/nuevo">Crear la primera</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => {
            const cat = NEWS_CATEGORIES[a.category];
            const status = STATUS_BADGE[a.status] ?? STATUS_BADGE.draft;
            return (
              <Card key={a.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CategoryBadge tone={cat.tone} label={cat.label} />
                        <Badge variant={status.variant} className="text-[0.65rem]">
                          {status.label}
                        </Badge>
                        {a.viewCount > 0 ? (
                          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                            {a.viewCount.toLocaleString("es-ES")} vistas
                          </span>
                        ) : null}
                      </div>
                      <CardTitle className="text-lg">
                        <Link
                          href={`/admin/noticias/${a.id}`}
                          className="hover:text-[var(--color-arena)]"
                        >
                          {a.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span>
                          /{a.slug}
                        </span>
                        <span>·</span>
                        <span>
                          {a.publishedAt
                            ? `Publicado ${formatDateTime(a.publishedAt)}`
                            : `Actualizado ${formatDateTime(a.updatedAt)}`}
                        </span>
                        {a.authorNickname ? (
                          <>
                            <span>·</span>
                            <span>por {a.authorNickname}</span>
                          </>
                        ) : null}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {a.status === "published" ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/noticias/${a.slug}`} target="_blank">
                            Ver
                          </Link>
                        </Button>
                      ) : null}
                      <Button asChild size="sm">
                        <Link href={`/admin/noticias/${a.id}`}>Editar</Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
