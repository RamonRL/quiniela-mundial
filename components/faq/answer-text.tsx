import Link from "next/link";

const ROUTES_TO_LINK = ["/precios", "/contacto"] as const;
type LinkableRoute = (typeof ROUTES_TO_LINK)[number];
const ROUTE_RE = new RegExp(`(${ROUTES_TO_LINK.join("|")})`, "g");
const ROUTE_SET = new Set<string>(ROUTES_TO_LINK);

/**
 * Renderiza la respuesta de una FAQ como texto plano, pero convirtiendo
 * cualquier mención literal a una ruta interna (`/precios`, `/contacto`)
 * en un enlace clicable. La fuente de datos sigue siendo un string para
 * que el JSON-LD de Google reciba texto plano sin marcado.
 */
export function AnswerText({ text }: { text: string }) {
  const parts = text.split(ROUTE_RE);
  return (
    <>
      {parts.map((part, i) =>
        ROUTE_SET.has(part) ? (
          <Link
            key={i}
            href={part as LinkableRoute}
            className="text-[var(--color-arena)] underline-offset-2 hover:underline"
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
