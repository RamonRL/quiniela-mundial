"use client";

import { useActionState, useMemo, useState } from "react";
import { Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewsBody } from "@/components/news/news-body";
import { upsertArticle, type FormState } from "./actions";

const initial: FormState = { ok: false };

const CATEGORIES = [
  { value: "convocatoria", label: "Convocatoria" },
  { value: "previa", label: "Previa" },
  { value: "cronica", label: "Crónica" },
  { value: "analisis", label: "Análisis" },
  { value: "lesion", label: "Lesión" },
  { value: "sorteo", label: "Sorteo" },
  { value: "destacada", label: "Destacada" },
] as const;

const STATUSES = [
  { value: "draft", label: "Borrador (solo admin)" },
  { value: "scheduled", label: "Programado" },
  { value: "published", label: "Publicado (visible)" },
  { value: "archived", label: "Archivado" },
] as const;

type TeamOpt = { code: string; name: string };
type MatchOpt = { id: number; label: string };

export type ArticleFormProps = {
  article?: {
    id: number;
    slug: string;
    title: string;
    seoTitle: string | null;
    excerpt: string;
    body: string;
    coverUrl: string | null;
    coverAlt: string | null;
    category: string;
    tags: string[];
    relatedTeamCodes: string[];
    relatedMatchId: number | null;
    status: string;
    publishedAt: Date | null;
  };
  teams: TeamOpt[];
  upcomingMatches: MatchOpt[];
};

function toLocalInputValue(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function ArticleForm({
  article,
  teams,
  upcomingMatches,
}: ArticleFormProps) {
  const [state, action, pending] = useActionState(upsertArticle, initial);
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [body, setBody] = useState(article?.body ?? "");
  const [previewing, setPreviewing] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    article?.relatedTeamCodes ?? [],
  );
  const slugSuggestion = useMemo(() => slugify(title), [title]);
  const effectiveSlug = slug || slugSuggestion;

  const toggleTeam = (code: string) => {
    setSelectedTeams((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {article ? <input type="hidden" name="id" value={article.id} /> : null}
      {/* Mantener selected teams en sync con un input oculto. */}
      <input
        type="hidden"
        name="relatedTeamCodes"
        value={selectedTeams.join(",")}
      />

      {/* ───────── Columna principal ───────── */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Convocatoria de España: Lamine Yamal lidera la lista de Luis de la Fuente"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={slugSuggestion || "auto"}
            />
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              /noticias/{effectiveSlug || "—"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seoTitle">SEO title (opcional, &lt; 70 chars)</Label>
            <Input
              id="seoTitle"
              name="seoTitle"
              maxLength={70}
              defaultValue={article?.seoTitle ?? ""}
              placeholder="Si difiere del título visible (más corto para Google)"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="excerpt">Resumen (meta description)</Label>
          <Textarea
            id="excerpt"
            name="excerpt"
            required
            rows={3}
            maxLength={280}
            defaultValue={article?.excerpt ?? ""}
            placeholder="1-2 frases. Aparece bajo el título en Google y en las cards."
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="body">Cuerpo (Markdown)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewing((p) => !p)}
            >
              {previewing ? (
                <>
                  <EyeOff className="size-3.5" />
                  Editar
                </>
              ) : (
                <>
                  <Eye className="size-3.5" />
                  Previsualizar
                </>
              )}
            </Button>
          </div>
          {previewing ? (
            <div className="min-h-[400px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <NewsBody body={body} />
            </div>
          ) : (
            <Textarea
              id="body"
              name="body"
              required
              rows={22}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="font-mono text-sm"
              placeholder={`## Subtítulo\n\nPárrafo. Puedes enlazar a [España](/equipos/ESP) y a [un partido](/partido/1).\n\n- Bullet\n- Bullet\n\n> Cita destacada\n\n| Columna 1 | Columna 2 |\n|-----------|-----------|\n| Valor     | Valor     |`}
            />
          )}
          {/* Cuando previsualizamos, el textarea no está en el DOM, por lo
              que el body no se envía. Aseguramos con un hidden. */}
          {previewing ? (
            <input type="hidden" name="body" value={body} />
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cover">Portada (imagen)</Label>
          <Input
            id="cover"
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
          {article?.coverUrl ? (
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Actual: {article.coverUrl.slice(0, 60)}…
            </p>
          ) : null}
          <input
            type="hidden"
            name="coverUrl"
            defaultValue={article?.coverUrl ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="coverAlt">Alt text de la portada (a11y + SEO)</Label>
          <Input
            id="coverAlt"
            name="coverAlt"
            maxLength={200}
            defaultValue={article?.coverAlt ?? ""}
            placeholder="Lamine Yamal celebra un gol con la camiseta de España"
          />
        </div>
      </div>

      {/* ───────── Columna lateral ───────── */}
      <aside className="space-y-5">
        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <Select name="category" defaultValue={article?.category ?? "convocatoria"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags (separados por coma)</Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={article?.tags.join(", ") ?? ""}
            placeholder="España, Luis de la Fuente, Lamine Yamal"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Selecciones relacionadas</Label>
          <div className="max-h-56 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2">
            <ul className="space-y-0.5 text-sm">
              {teams.map((t) => (
                <li key={t.code}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-[var(--color-surface)]">
                    <input
                      type="checkbox"
                      checked={selectedTeams.includes(t.code)}
                      onChange={() => toggleTeam(t.code)}
                      className="accent-[var(--color-arena)]"
                    />
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {t.code}
                    </span>
                    <span>{t.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          {selectedTeams.length > 0 ? (
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {selectedTeams.length} sel. — {selectedTeams.join(", ")}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="relatedMatchId">Partido relacionado (opcional)</Label>
          <select
            id="relatedMatchId"
            name="relatedMatchId"
            defaultValue={article?.relatedMatchId?.toString() ?? ""}
            className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
          >
            <option value="">— ninguno —</option>
            {upcomingMatches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Estado</Label>
          <Select name="status" defaultValue={article?.status ?? "draft"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="publishedAt">
            Fecha de publicación (opcional)
          </Label>
          <Input
            id="publishedAt"
            name="publishedAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(article?.publishedAt ?? null)}
          />
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            Vacío → ahora al publicar
          </p>
        </div>

        <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
          <Button type="submit" disabled={pending} className="w-full">
            <Save className="size-4" />
            {pending ? "Guardando…" : article ? "Guardar cambios" : "Crear noticia"}
          </Button>
          {state.error ? (
            <p className="rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
              {state.error}
            </p>
          ) : null}
          {state.ok ? (
            <p className="rounded-md border border-[var(--color-pitch)]/30 bg-[var(--color-pitch)]/10 px-3 py-2 text-xs text-[var(--color-pitch-deep,var(--color-pitch))]">
              Guardado correctamente.
            </p>
          ) : null}
        </div>
      </aside>
    </form>
  );
}
