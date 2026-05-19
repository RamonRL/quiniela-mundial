import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

/**
 * Render del cuerpo del artículo en Markdown. Estilo "editorial" con:
 * - Headings h2/h3 con jerarquía clara (no permitimos h1 → ya lo da la
 *   página, dos h1 confunden a Google y suben crawl warnings).
 * - Párrafos en Fraunces upright (la .font-editorial dejó de ser italic
 *   por defecto: la itálica cansa en lectura larga). leading 1.7 y
 *   tamaño base 17-18px para confort tipográfico.
 * - Listas con bullets de arena.
 * - Links del propio dominio renderizados con <Link> de Next (sin full
 *   page reload). Externos abren en nueva pestaña con rel=nofollow.
 * - Blockquotes en itálica (el único bloque donde se conserva el
 *   "swing" editorial — para citar fuentes y resaltar pensamientos).
 *
 * Sin sintaxis adicional (no HTML embebido, no react components vía MDX):
 * el body es texto que yo redacto + linkamos a equipos/partidos en el
 * Markdown.
 */

const SITE_HOST = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://quinielamundial.es"
)
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

function isInternal(href: string): boolean {
  if (href.startsWith("/")) return true;
  if (href.startsWith("#")) return true;
  try {
    const u = new URL(href);
    return u.host === SITE_HOST;
  } catch {
    return false;
  }
}

export function NewsBody({ body }: { body: string }) {
  return (
    <div className="news-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: () => null,
          h2: ({ children }) => (
            <h2 className="font-display mt-12 text-3xl leading-tight tracking-tight first:mt-0 sm:text-4xl">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display mt-8 text-xl leading-tight tracking-tight sm:text-2xl">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="font-editorial mt-5 text-[1.0625rem] leading-[1.7] text-[var(--color-ink)] sm:text-[1.125rem]">
              {children}
            </p>
          ),
          a: ({ href, children }) => {
            const to = String(href ?? "");
            if (isInternal(to)) {
              return (
                <Link
                  href={to}
                  className="underline decoration-[var(--color-arena)] decoration-2 underline-offset-4 transition hover:text-[var(--color-arena)]"
                >
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={to}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="underline decoration-[var(--color-arena)] decoration-2 underline-offset-4 transition hover:text-[var(--color-arena)]"
              >
                {children}
              </a>
            );
          },
          ul: ({ children }) => (
            <ul className="mt-5 space-y-2 pl-5 font-editorial text-[1.0625rem] leading-[1.7] marker:text-[var(--color-arena)] sm:text-[1.125rem]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-5 list-decimal space-y-2 pl-5 font-editorial text-[1.0625rem] leading-[1.7] marker:text-[var(--color-arena)] sm:text-[1.125rem]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-4 border-[var(--color-arena)] bg-[var(--color-surface-2)] px-5 py-4 font-editorial italic text-[var(--color-muted-foreground)]">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-10 border-0 border-t border-[var(--color-border)]" />
          ),
          table: ({ children }) => (
            <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-left font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-[var(--color-border)] px-3 py-2 last:border-b-0">
              {children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--color-ink)]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="font-editorial italic">{children}</em>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
