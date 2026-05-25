import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { LEGAL_LAST_UPDATED, LEGAL_OWNER } from "@/lib/legal";

export const revalidate = 86400;

export const metadata = {
  title: "Términos de uso",
  description:
    "Términos y condiciones de uso de Quiniela Mundial 2026. Reglas, propiedad intelectual, planes de pago, devoluciones y limitación de responsabilidad.",
  alternates: { canonical: "/terminos" },
  robots: { index: true, follow: true },
};

export default function TerminosPage() {
  return (
    <div className="space-y-12">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Términos de uso", href: "/terminos" },
        ]}
      />

      <PageHeader
        eyebrow="Legal"
        title="Términos de uso"
        description={`Última actualización: ${LEGAL_LAST_UPDATED}.`}
      />

      <section className="space-y-10 font-editorial text-[0.95rem] leading-relaxed text-[var(--color-foreground)] sm:text-base">
        <Block title="1. Aceptación de los términos">
          <p>
            El acceso y uso de{" "}
            <strong className="not-italic font-semibold">
              quinielamundial.es
            </strong>{" "}
            (en adelante, el «Sitio») implica la aceptación expresa e
            incondicional de los presentes términos de uso. Si no estás de
            acuerdo con alguno de ellos, te rogamos que no utilices el
            Sitio.
          </p>
        </Block>

        <Block title="2. Descripción del servicio">
          <p>
            Quiniela Mundial es una aplicación web que permite a sus
            usuarios realizar predicciones sobre los partidos, grupos,
            goleadores y bracket de la Copa Mundial de la FIFA 2026 dentro
            de quinielas grupales (públicas o privadas). Las predicciones
            generan puntuaciones automáticas y rankings entre los
            participantes.
          </p>
          <p className="mt-3">
            El servicio es un <strong className="font-semibold not-italic">
              juego de predicción deportiva por habilidad
            </strong>, con fines lúdicos y de entretenimiento exclusivamente.{" "}
            <strong className="font-semibold not-italic">
              No constituye apuestas, no es juego de azar y no exige
              contraprestación económica para participar
            </strong>{" "}
            (conforme a la Ley 13/2011 de regulación del juego). El Sitio{" "}
            <strong className="font-semibold not-italic">no entrega premios monetarios</strong>;
            el reconocimiento al ganador, en su caso, es un trofeo físico
            simbólico o lo que pacten los participantes entre sí.
          </p>
        </Block>

        <Block title="3. Cuentas de usuario">
          <p>
            El registro se realiza exclusivamente mediante autenticación
            OAuth con Google. Al iniciar sesión, autorizas al Sitio a
            recibir tu nombre, email y foto de perfil públicos de Google
            para crear tu cuenta.
          </p>
          <p className="mt-3">
            Eres responsable de mantener la confidencialidad de tu cuenta
            de Google. Cualquier actividad realizada desde tu cuenta se
            entenderá realizada por ti. Si detectas un uso no autorizado,
            notifícalo inmediatamente a{" "}
            <a
              href={`mailto:${LEGAL_OWNER.email}`}
              className="text-[var(--color-arena)] underline-offset-2 hover:underline"
            >
              {LEGAL_OWNER.email}
            </a>
            .
          </p>
        </Block>

        <Block title="4. Reglas de uso">
          <p>
            Al usar el Sitio te comprometes a:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6 not-italic">
            <li>No crear varias cuentas para participar en una misma quiniela.</li>
            <li>
              No utilizar mecanismos automatizados (bots, scraping) para
              acceder al servicio o sus predicciones.
            </li>
            <li>
              No publicar en el chat mensajes ofensivos, discriminatorios,
              spam, contenido sexual o ilegal.
            </li>
            <li>No suplantar la identidad de otros usuarios o de terceros.</li>
            <li>
              No utilizar la aplicación para fines comerciales no
              autorizados o como soporte para apuestas con contraprestación
              monetaria.
            </li>
          </ul>
          <p className="mt-3">
            El incumplimiento de cualquiera de estas reglas puede conllevar
            la suspensión inmediata de la cuenta y, en su caso, su
            eliminación, sin derecho a reembolso de cualquier Pase
            adquirido.
          </p>
        </Block>

        <Block title="5. Quinielas privadas y planes de pago">
          <p>
            Cualquier usuario puede crear quinielas privadas gratuitas con
            un tope de 20 miembros. Para grupos mayores se ofrecen tres{" "}
            <strong className="not-italic font-semibold">Pases Mundial 2026</strong>{" "}
            de pago único por torneo:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6 not-italic">
            <li>Pase Equipo — hasta 50 miembros (19 €)</li>
            <li>Pase Empresa — hasta 100 miembros (49 €)</li>
            <li>Pase Empresa Plus — hasta 250 miembros (99 €)</li>
          </ul>
          <p className="mt-3">
            Detalles e información actualizada en{" "}
            <Link
              href="/precios"
              className="text-[var(--color-arena)] underline-offset-2 hover:underline"
            >
              /precios
            </Link>
            .
          </p>
        </Block>

        <Block title="6. Procesamiento del pago y facturación">
          <p>
            El cobro de los Pases lo procesa{" "}
            <strong className="not-italic font-semibold">Lemon Squeezy</strong>{" "}
            como Merchant of Record. Esto significa que Lemon Squeezy es
            quien legalmente vende el producto al usuario, emite la
            factura con el IVA correspondiente y gestiona las obligaciones
            fiscales asociadas. Quiniela Mundial actúa como proveedor del
            servicio subyacente.
          </p>
          <p className="mt-3">
            Al adquirir un Pase, aceptas también los{" "}
            <a
              href="https://www.lemonsqueezy.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-arena)] underline-offset-2 hover:underline"
            >
              Términos de Lemon Squeezy
            </a>
            . La factura legal con los datos fiscales que indiques durante
            el checkout queda disponible para descarga inmediata.
          </p>
        </Block>

        <Block title="7. Política de devoluciones">
          <p>
            Conforme al artículo 103.m del Texto Refundido de la Ley
            General para la Defensa de los Consumidores y Usuarios, el
            derecho de desistimiento NO aplica una vez ha comenzado la
            prestación del servicio digital, lo que ocurre en el momento
            del kickoff del Mundial (11 de junio de 2026).
          </p>
          <p className="mt-3">
            Antes de esa fecha, si decides no usar el Pase puedes
            solicitarnos la devolución a{" "}
            <a
              href={`mailto:${LEGAL_OWNER.email}`}
              className="text-[var(--color-arena)] underline-offset-2 hover:underline"
            >
              {LEGAL_OWNER.email}
            </a>
            . Tramitaremos la devolución a través de Lemon Squeezy en un
            plazo máximo de 14 días naturales desde la solicitud, siempre
            que el torneo no haya comenzado.
          </p>
        </Block>

        <Block title="8. Propiedad intelectual">
          <p>
            Todos los derechos sobre el código, diseño, marca, textos
            editoriales (FAQs, descripciones de plantillas, noticias) y
            cualquier otro elemento creativo del Sitio son titularidad de{" "}
            {LEGAL_OWNER.fullName}. Se reservan todos los derechos.
          </p>
          <p className="mt-3">
            Los datos del torneo (nombres de selecciones, jugadores,
            sedes, calendario oficial) proceden de fuentes públicas
            oficiales y se utilizan al amparo del derecho de cita.
          </p>
        </Block>

        <Block title="9. Contenido generado por el usuario">
          <p>
            Las predicciones que introduces son tuyas. Los mensajes que
            publicas en el chat de una quiniela son responsabilidad
            exclusiva del autor. Al publicarlos, concedes a Quiniela
            Mundial una licencia no exclusiva, mundial, gratuita y
            limitada al funcionamiento del servicio para procesarlos,
            almacenarlos y mostrarlos a los demás miembros de la quiniela
            correspondiente.
          </p>
          <p className="mt-3">
            Nos reservamos el derecho a eliminar mensajes que infrinjan
            estos términos o la legislación aplicable.
          </p>
        </Block>

        <Block title="10. Limitación de responsabilidad">
          <p>
            El Sitio se ofrece «tal cual». Aunque ponemos todo el cuidado
            posible, no garantizamos que el servicio esté libre de errores
            ni que su disponibilidad sea ininterrumpida. No nos hacemos
            responsables de daños o perjuicios derivados de:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6 not-italic">
            <li>
              Interrupciones, fallos técnicos o pérdidas de datos no
              imputables a dolo o negligencia grave del titular.
            </li>
            <li>Resultados deportivos imprevistos que afecten al cálculo de puntuaciones.</li>
            <li>
              Decisiones adoptadas por los participantes sobre cualquier
              reconocimiento que acuerden entre ellos al margen del Sitio.
            </li>
            <li>
              Contenidos de terceros enlazados desde el Sitio (federaciones,
              FIFA, medios deportivos, redes sociales).
            </li>
          </ul>
        </Block>

        <Block title="11. No afiliación con FIFA">
          <p>
            Quiniela Mundial no está afiliada, asociada, autorizada,
            respaldada por, ni vinculada oficialmente con la Fédération
            Internationale de Football Association (FIFA) ni con ninguna
            de sus filiales. Todos los nombres, marcas y logos
            relacionados con la Copa Mundial son propiedad de sus
            respectivos titulares.
          </p>
        </Block>

        <Block title="12. Modificaciones del servicio y de los términos">
          <p>
            Nos reservamos el derecho a modificar, suspender o
            descontinuar partes del Sitio en cualquier momento, así como a
            actualizar estos términos. Las modificaciones sustanciales se
            anunciarán a los usuarios registrados por email o mediante
            aviso en el propio Sitio.
          </p>
        </Block>

        <Block title="13. Ley aplicable y jurisdicción">
          <p>
            Estos términos se rigen por la legislación española. Para la
            resolución de cualquier controversia, las partes se someten a
            los Juzgados y Tribunales del domicilio del usuario cuando
            actúe en calidad de consumidor, o a los del domicilio del
            titular en el resto de los casos.
          </p>
        </Block>

        <Block title="14. Contacto">
          <p>
            Para cualquier duda relativa a estos términos, escríbenos a{" "}
            <a
              href={`mailto:${LEGAL_OWNER.email}`}
              className="text-[var(--color-arena)] underline-offset-2 hover:underline"
            >
              {LEGAL_OWNER.email}
            </a>
            . También puedes seguirnos en redes:{" "}
            <a
              href={LEGAL_OWNER.social.tiktok.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-arena)] underline-offset-2 hover:underline"
            >
              TikTok {LEGAL_OWNER.social.tiktok.handle}
            </a>{" "}
            y{" "}
            <a
              href={LEGAL_OWNER.social.x.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-arena)] underline-offset-2 hover:underline"
            >
              X {LEGAL_OWNER.social.x.handle}
            </a>
            .
          </p>
        </Block>
      </section>

      <LegalCross current="/terminos" />
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
    { href: "/aviso-legal", label: "Aviso legal" },
    { href: "/privacidad", label: "Política de privacidad" },
    { href: "/cookies", label: "Política de cookies" },
    { href: "/terminos", label: "Términos de uso" },
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
