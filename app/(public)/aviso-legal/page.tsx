import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { LEGAL_LAST_UPDATED, LEGAL_OWNER } from "@/lib/legal";

export const revalidate = 86400;

export const metadata = {
  title: "Aviso legal",
  description:
    "Aviso legal de Quiniela Mundial 2026 conforme a la Ley 34/2002 (LSSI-CE). Identificación del titular, condiciones de uso y propiedad intelectual.",
  alternates: { canonical: "/aviso-legal" },
  robots: { index: true, follow: true },
};

export default function AvisoLegalPage() {
  return (
    <div className="space-y-12">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Aviso legal", href: "/aviso-legal" },
        ]}
      />

      <PageHeader
        eyebrow="Legal"
        title="Aviso legal"
        description={`Última actualización: ${LEGAL_LAST_UPDATED}.`}
      />

      <section className="space-y-10 font-editorial text-[0.95rem] leading-relaxed text-[var(--color-foreground)] sm:text-base">
        <Block title="1. Identificación del titular">
          <p>
            En cumplimiento del artículo 10 de la Ley 34/2002 de Servicios de la
            Sociedad de la Información y Comercio Electrónico (LSSI-CE), se
            informa de los siguientes datos del titular del sitio web{" "}
            <strong className="not-italic font-semibold">
              quinielamundial.es
            </strong>{" "}
            (en adelante, el «Sitio»):
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6 not-italic">
            <li>
              <strong className="font-semibold">Titular:</strong>{" "}
              {LEGAL_OWNER.fullName}
            </li>
            <li>
              <strong className="font-semibold">NIF:</strong>{" "}
              <code className="font-mono text-sm">{LEGAL_OWNER.dni}</code>
            </li>
            <li>
              <strong className="font-semibold">Domicilio:</strong>{" "}
              {LEGAL_OWNER.address}
            </li>
            <li>
              <strong className="font-semibold">Contacto:</strong>{" "}
              <a
                href={`mailto:${LEGAL_OWNER.email}`}
                className="text-[var(--color-arena)] underline-offset-2 hover:underline"
              >
                {LEGAL_OWNER.email}
              </a>
            </li>
          </ul>
        </Block>

        <Block title="2. Objeto del Sitio">
          <p>
            Quiniela Mundial es una aplicación web sin ánimo de lucro afín a
            personas físicas y jurídicas que deseen organizar quinielas de
            predicciones sobre la Copa Mundial de la FIFA 2026. El uso del
            Sitio es gratuito hasta 20 miembros por quiniela privada. Para
            grupos mayores se ofrecen Pases Mundial 2026 de pago, cuyo cobro
            y facturación los procesa Paddle como Merchant of Record
            (más detalles en{" "}
            <Link
              href="/terminos"
              className="text-[var(--color-arena)] underline-offset-2 hover:underline"
            >
              los Términos de Uso
            </Link>
            ).
          </p>
          <p className="mt-3">
            El Sitio no está afiliado, asociado, autorizado, respaldado por,
            ni vinculado oficialmente con la Fédération Internationale de
            Football Association (FIFA) ni con ninguna de sus filiales. Toda
            la información sobre el torneo proviene de fuentes públicas
            oficiales y se cita como referencia.
          </p>
        </Block>

        <Block title="3. Condiciones de acceso y uso">
          <p>
            El acceso al Sitio es gratuito. Determinadas funcionalidades
            (predicciones, ranking, chat, quinielas privadas) requieren
            registro previo. El usuario se compromete a hacer un uso
            diligente, lícito y de buena fe del Sitio, así como de los
            contenidos y servicios disponibles, conforme a la legislación
            aplicable, la moral, el orden público y las buenas costumbres.
          </p>
          <p className="mt-3">
            Queda prohibido cualquier uso del Sitio que pueda dañar imagen,
            interés o derechos de Quiniela Mundial, de otros usuarios o de
            terceros, incluyendo de forma no limitativa: la introducción de
            virus, el envío de spam, el acceso no autorizado a cuentas
            ajenas o el scraping automatizado de contenidos.
          </p>
        </Block>

        <Block title="4. Propiedad intelectual e industrial">
          <p>
            El código fuente, el diseño gráfico, las imágenes, los textos
            editoriales (noticias, FAQs, descripciones de plantillas) y el
            resto de elementos creativos del Sitio son propiedad de{" "}
            {LEGAL_OWNER.fullName} o cuentan con la correspondiente licencia
            de uso. Está prohibida su reproducción, distribución,
            comunicación pública o transformación sin autorización expresa
            del titular.
          </p>
          <p className="mt-3">
            Las marcas, logotipos y nombres comerciales de terceros que
            puedan aparecer (FIFA, federaciones nacionales, clubes,
            jugadores, sedes, patrocinadores oficiales) son propiedad de
            sus respectivos titulares. Su mención en el Sitio se realiza al
            amparo del derecho de cita con fines informativos y editoriales.
          </p>
        </Block>

        <Block title="5. Limitación de responsabilidad">
          <p>
            El titular del Sitio no garantiza la disponibilidad
            ininterrumpida del servicio, ni la ausencia de errores en su
            contenido o en el cálculo automático de puntuaciones. El titular
            queda exonerado de cualquier responsabilidad derivada del uso
            indebido del Sitio por parte de los usuarios, así como de los
            daños o perjuicios derivados de las predicciones realizadas — la
            aplicación tiene únicamente fines lúdicos y de entretenimiento.
          </p>
          <p className="mt-3">
            Las quinielas no constituyen apuestas reguladas ni juegos de
            azar conforme a la Ley 13/2011, de 27 de mayo, de regulación
            del juego. No hay premios monetarios garantizados por el Sitio;
            los premios que los participantes acuerden de manera privada
            entre ellos son ajenos al titular.
          </p>
        </Block>

        <Block title="6. Enlaces a terceros">
          <p>
            El Sitio puede contener enlaces a webs de terceros (FIFA, ligas
            europeas, medios deportivos, redes sociales). El titular del
            Sitio no se hace responsable del contenido, prácticas o
            políticas de privacidad de esos terceros — el acceso a ellos
            es bajo la única responsabilidad del usuario.
          </p>
        </Block>

        <Block title="7. Modificación del Aviso Legal">
          <p>
            El titular se reserva el derecho a modificar el presente Aviso
            Legal en cualquier momento. Las modificaciones se publicarán en
            esta misma página y entrarán en vigor desde su publicación. La
            fecha de la última revisión aparece al inicio del documento.
          </p>
        </Block>

        <Block title="8. Legislación aplicable y jurisdicción">
          <p>
            La relación entre el titular y los usuarios del Sitio se rige
            por la legislación española. Para la resolución de cualquier
            controversia derivada del uso del Sitio, las partes se someten
            a los Juzgados y Tribunales del domicilio del usuario cuando
            actúe en calidad de consumidor, o a los del domicilio del
            titular en el resto de los casos.
          </p>
        </Block>
      </section>

      <LegalCross current="/aviso-legal" />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl tracking-tight sm:text-3xl">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function LegalCross({ current }: { current: string }) {
  const items: { href: string; label: string }[] = [
    { href: "/privacidad", label: "Política de privacidad" },
    { href: "/cookies", label: "Política de cookies" },
    { href: "/terminos", label: "Términos de uso" },
    { href: "/aviso-legal", label: "Aviso legal" },
  ].filter((i) => i.href !== current);

  return (
    <nav className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-6 text-xs">
      <span className="font-mono uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        Más legal:
      </span>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.12em] transition hover:border-[var(--color-arena)]/40"
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
