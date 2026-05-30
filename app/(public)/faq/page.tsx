import Link from "next/link";
import { ArrowRight, HelpCircle, Mail } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { BreadcrumbLD, FAQPageLD } from "@/components/seo/jsonld";
import { AnswerText } from "@/components/faq/answer-text";

// FAQ es estático: cacheamos generosamente (24 h).
export const revalidate = 86400;

export const metadata = {
  title: "Preguntas frecuentes",
  description:
    "Cómo funciona Quiniela Mundial 2026: cuentas, quinielas privadas, código de invitación, predicciones, puntos y deadlines.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQs · Quiniela Mundial 2026",
    description:
      "Todo lo que necesitas saber sobre Quiniela Mundial 2026: cuentas, quinielas privadas, predicciones y puntos.",
    url: "/faq",
  },
};

type Faq = { q: string; a: string };

// Las preguntas se agrupan por temática para que la página resulte
// escaneable. Todas se sirven además como JSON-LD FAQPage para que Google
// pueda mostrarlas como rich result en los resultados de búsqueda.
const SECTIONS: { title: string; faqs: Faq[] }[] = [
  {
    title: "Cómo funciona la quiniela",
    faqs: [
      {
        q: "¿Es lo mismo una quiniela del Mundial que una porra, un prode, una polla o un pool?",
        a: "Sí, son nombres distintos para lo mismo según el país: porra en España, prode en Argentina y Uruguay, polla en Colombia y Venezuela, pool en EE. UU. y bolón en algunas zonas. Todas son lo que ofrecemos aquí: una quiniela del Mundial 2026 donde tú y tu grupo predecís los resultados (marcador, goleadores, posiciones, bracket) y vais sumando puntos. Si tu liga prefiere llamarla porra, prode, polla o pool, la app funciona exactamente igual.",
      },
      {
        q: "¿Cómo funciona Quiniela Mundial 2026?",
        a: "Te unes a una quiniela (la pública o una privada con código de 4 dígitos), predices las posiciones de los 12 grupos, el bracket completo, los goleadores, los marcadores partido a partido y otras predicciones especiales. Vas sumando puntos según aciertes. Hay ranking general y por liga, en directo durante el torneo.",
      },
      {
        q: "¿Es gratis hacer una quiniela?",
        a: "Sí, hasta 20 miembros por quiniela privada. Puedes crear hasta 5 privadas gratis con tus amigos y participar siempre en la Quiniela Pública. Para empresas o grupos más grandes (50, 100 o 250 miembros), tenemos Pases Mundial 2026 desde 19 € — mira /precios.",
      },
      {
        q: "¿Tenéis planes para empresas o grupos grandes?",
        a: "Sí. La versión Free aguanta hasta 20 miembros por quiniela. Para empresas, comunidades o eventos con más gente hay tres Pases Mundial 2026 (19 € hasta 50 miembros · 49 € hasta 100 · 99 € hasta 250) que incluyen logo corporativo custom, anuncio fijado del organizador, export CSV del ranking y soporte prioritario. Pago único por torneo. Más en /precios.",
      },
      {
        q: "¿Hay app para iPhone y Android?",
        a: "Funciona como Progressive Web App: desde Safari (iPhone/iPad) o Chrome (Android) puedes 'Añadir a pantalla de inicio' y se comporta como una app nativa, en pantalla completa y con su icono propio.",
      },
      {
        q: "¿Quién organiza el torneo?",
        a: "El Mundial 2026 lo organiza la FIFA. Esta web no está afiliada con la FIFA — es solo una herramienta de predicciones. Toda la información de calendario, grupos y sedes refleja la programación oficial publicada por FIFA.",
      },
    ],
  },
  {
    title: "Cuentas y privacidad",
    faqs: [
      {
        q: "¿Cómo me registro?",
        a: "Solo con Google. Pinchas en 'Crear quiniela' o 'Entrar', autorizas con tu cuenta de Google y entras directo. No hay formulario de email ni contraseña que recordar.",
      },
      {
        q: "¿Qué datos guardáis?",
        a: "Tu email, nombre, avatar (los que devuelve Google), tus predicciones, tus mensajes en chat y los puntos que vayas sumando. Nada más.",
      },
      {
        q: "¿Puedo borrar mi cuenta?",
        a: "Sí. Desde Mi Perfil puedes solicitar borrado o, si lo prefieres, escribe a admin@quinielamundial.es y la procesamos manualmente.",
      },
    ],
  },
  {
    title: "Quinielas privadas",
    faqs: [
      {
        q: "¿Cómo creo mi quiniela privada?",
        a: "Tras el login te llevamos al onboarding. Eliges 'Crear quiniela', le pones nombre (máx 25 caracteres) y la app te genera un código de 4 dígitos y un enlace de invitación, ambos fijos para siempre.",
      },
      {
        q: "¿Cómo me uno a la quiniela de mis amigos?",
        a: "Pídele al creador el código de 4 dígitos o el enlace de invitación. Lo introduces en la pantalla de unirme y entras al instante.",
      },
      {
        q: "¿Cuántas quinielas privadas puedo tener?",
        a: "Hasta 5 privadas por usuario, además de la Quiniela Pública (siempre activa). Puedes ser creador de unas y participante en otras; cada una con su propio ranking.",
      },
      {
        q: "¿Cuántos miembros caben en mi quiniela privada?",
        a: "Hasta 20 miembros en plan Free. Si tu grupo crece (empresa, comunidad, evento), puedes ampliarla a 50, 100 o 250 miembros con un Pase Mundial 2026 — no migras datos, suben el límite en la misma liga. Detalles y precios en /precios.",
      },
      {
        q: "¿Puedo expulsar a alguien de mi quiniela?",
        a: "Sí, si eres el creador. Desde 'Mi Quiniela' tienes un botón para quitar miembros y otro para eliminar la quiniela entera (todos pasan a la pública).",
      },
      {
        q: "¿Puedo abandonar una quiniela en la que estoy?",
        a: "Sí, desde 'Mi Quiniela'. La pública es la única excepción — es permanente. Tras abandonar una privada, vuelves a tener la pública como activa.",
      },
    ],
  },
  {
    title: "Predicciones y puntos",
    faqs: [
      {
        q: "¿Cuáles son las 6 categorías de predicción?",
        a: "Posiciones por grupo, bracket FIFA completo, goleador del torneo (Bota de Oro), marcadores partido a partido, goleador por partido y predicciones especiales (preguntas tipo '¿habrá penaltis en cuartos?').",
      },
      {
        q: "¿Hasta cuándo puedo cambiar mi predicción?",
        a: "Cada categoría tiene su deadline. Las posiciones por grupo y la Bota de Oro cierran al kickoff del torneo. Cada partido cierra al inicio del propio partido. El bracket cierra al primer R32. Las especiales tienen su propia fecha (siempre antes del momento que se predice).",
      },
      {
        q: "¿Cómo se calculan los puntos?",
        a: "Cada categoría tiene su propia rúbrica. Por ejemplo: en marcadores ganas más puntos por marcador exacto que por solo acertar el ganador; en goleador por partido sumas si tu jugador marca; en grupos sumas por cada posición correcta. Tienes el desglose completo y los puntos exactos en /puntuacion, y también los verás en cada pantalla de predicción.",
      },
      {
        q: "¿Puedo ver las predicciones de los demás?",
        a: "Sí, pero solo se hacen públicas cuando ya no se pueden cambiar. Una vez empieza el partido (o se cierra la fase), las predicciones de toda la liga quedan visibles para todos. Antes están bloqueadas.",
      },
      {
        q: "¿Qué pasa si no predigo un partido?",
        a: "Te quedas a cero puntos en ese partido. La app te avisa con un banner cuando una jornada está a punto de cerrarse y todavía te quedan partidos sin predecir.",
      },
    ],
  },
  {
    title: "Sobre el Mundial 2026",
    faqs: [
      {
        q: "¿Cuándo y dónde se juega?",
        a: "Del 11 de junio al 19 de julio de 2026 en Estados Unidos, Canadá y México. Es la primera edición con 48 selecciones, 12 grupos, 104 partidos y 16 sedes repartidas entre los tres países anfitriones.",
      },
      {
        q: "¿Cómo es el formato esta vez?",
        a: "Cambia respecto a ediciones anteriores: 12 grupos de 4 equipos, top 2 + los 8 mejores terceros pasan a una nueva ronda de R32 (dieciseisavos). Después octavos, cuartos, semifinales y final el 19 de julio en Nueva York-NJ.",
      },
      {
        q: "¿Dónde se juega la final?",
        a: "MetLife Stadium, Nueva York-NJ. La inauguración el 11 de junio en el Estadio Azteca de Ciudad de México.",
      },
    ],
  },
];

const ALL_FAQS = SECTIONS.flatMap((s) => s.faqs);

export default function FaqPage() {
  return (
    <div className="space-y-12">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "FAQs", href: "/faq" },
        ]}
      />
      <FAQPageLD faqs={ALL_FAQS} />

      <PageHeader
        eyebrow="Ayuda"
        title="Preguntas frecuentes"
        description="Lo que más nos preguntan sobre cuentas, quinielas, predicciones y el torneo. Si no encuentras tu respuesta, escríbenos."
      />

      <div className="space-y-10">
        {SECTIONS.map((section, i) => (
          <section key={i} className="space-y-4">
            <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
              <span className="font-display text-xl tracking-tight text-[var(--color-arena)] glow-arena">
                {(i + 1).toString().padStart(2, "0")}
              </span>
              <h2 className="font-display text-2xl tracking-tight">
                {section.title}
              </h2>
            </header>
            <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              {section.faqs.map((f, j) => (
                <details key={j} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span className="font-display text-base tracking-tight sm:text-lg">
                      {f.q}
                    </span>
                    <span
                      aria-hidden
                      className="font-mono text-xs text-[var(--color-arena)] transition group-open:rotate-45"
                    >
                      ＋
                    </span>
                  </summary>
                  <p className="pt-3 font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
                    <AnswerText text={f.a} />
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA al final → mover al usuario a Contacto si no encuentra la
          respuesta que buscaba. */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-8 text-center">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div className="relative space-y-3">
          <span className="grid mx-auto size-12 place-items-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
            <HelpCircle className="size-5" />
          </span>
          <p className="font-display text-2xl tracking-tight">
            ¿No encuentras lo que buscas?
          </p>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Escríbeme y respondo en cuanto pueda.
          </p>
          <Link
            href="/contacto"
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
          >
            Ir a contacto
            <ArrowRight className="size-3.5" />
          </Link>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            o directamente a{" "}
            <a
              href="mailto:admin@quinielamundial.es"
              className="text-[var(--color-arena)]"
            >
              <Mail className="inline size-3" /> admin@quinielamundial.es
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
