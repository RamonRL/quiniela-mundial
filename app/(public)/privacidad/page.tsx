import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { LEGAL_LAST_UPDATED, LEGAL_OWNER } from "@/lib/legal";

export const revalidate = 86400;

export const metadata = {
  title: "Política de privacidad",
  description:
    "Política de privacidad de Quiniela Mundial 2026. Datos que tratamos, finalidades, terceros con los que compartimos información y derechos del usuario conforme al RGPD.",
  alternates: { canonical: "/privacidad" },
  robots: { index: true, follow: true },
};

export default function PrivacidadPage() {
  return (
    <div className="space-y-12">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Política de privacidad", href: "/privacidad" },
        ]}
      />

      <PageHeader
        eyebrow="Legal"
        title="Política de privacidad"
        description={`Última actualización: ${LEGAL_LAST_UPDATED}.`}
      />

      <section className="space-y-10 font-editorial text-[0.95rem] leading-relaxed text-[var(--color-foreground)] sm:text-base">
        <Block title="1. Responsable del tratamiento">
          <p>
            En cumplimiento del Reglamento (UE) 2016/679 (RGPD) y de la Ley
            Orgánica 3/2018, de Protección de Datos Personales y garantía de
            los derechos digitales (LOPDGDD), se informa que el responsable
            del tratamiento de los datos personales recogidos a través de{" "}
            <strong className="not-italic font-semibold">
              quinielamundial.es
            </strong>{" "}
            es:
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
              <strong className="font-semibold">Contacto para asuntos de privacidad:</strong>{" "}
              <a
                href={`mailto:${LEGAL_OWNER.email}`}
                className="text-[var(--color-arena)] underline-offset-2 hover:underline"
              >
                {LEGAL_OWNER.email}
              </a>
            </li>
          </ul>
        </Block>

        <Block title="2. Datos que tratamos y finalidad">
          <p>Tratamos las siguientes categorías de datos personales:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6 not-italic">
            <li>
              <strong className="font-semibold">Datos de cuenta:</strong>{" "}
              email, nombre, foto de perfil — facilitados al iniciar sesión
              con tu cuenta de Google.
            </li>
            <li>
              <strong className="font-semibold">Datos del perfil:</strong>{" "}
              apodo, avatar opcional, país (deducido de tu IP en el primer
              registro), preferencias de interfaz.
            </li>
            <li>
              <strong className="font-semibold">Datos de actividad:</strong>{" "}
              tus predicciones, mensajes en el chat de la quiniela, puntos
              acumulados, última conexión.
            </li>
            <li>
              <strong className="font-semibold">Datos técnicos:</strong>{" "}
              dirección IP, navegador, sistema operativo, sesiones de
              autenticación. Se procesan únicamente para garantizar la
              seguridad del Sitio.
            </li>
            <li>
              <strong className="font-semibold">Datos de pago:</strong> el
              pago se gestiona directamente entre el cliente y el titular
              del Sitio por transferencia bancaria, Bizum o PayPal tras
              recibir las instrucciones por email. No almacenamos datos
              de tarjeta ni credenciales de pago en nuestros sistemas.
            </li>
          </ul>
          <p className="mt-3">
            La finalidad del tratamiento es prestar el servicio de la
            aplicación (mostrar predicciones, calcular puntuaciones, gestionar
            quinielas privadas), comunicarnos contigo en relación con tu
            cuenta, atender solicitudes de soporte y cumplir nuestras
            obligaciones legales.
          </p>
        </Block>

        <Block title="3. Base legal del tratamiento">
          <p>
            Tratamos tus datos en base a:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6 not-italic">
            <li>
              <strong className="font-semibold">Ejecución del contrato</strong>{" "}
              (RGPD Art. 6.1.b): tu registro y participación en quinielas
              implica una relación de servicio que requiere el tratamiento
              descrito.
            </li>
            <li>
              <strong className="font-semibold">Interés legítimo</strong>{" "}
              (RGPD Art. 6.1.f): para garantizar la seguridad del servicio,
              prevenir fraude o abuso, y gestionar incidencias técnicas.
            </li>
            <li>
              <strong className="font-semibold">Consentimiento</strong>{" "}
              (RGPD Art. 6.1.a): en su caso, para comunicaciones
              promocionales (de momento no enviamos ninguna).
            </li>
          </ul>
        </Block>

        <Block title="4. Plazo de conservación">
          <p>
            Conservamos tus datos durante el tiempo en que mantengas tu cuenta
            activa. Si la eliminas o nos la solicitas por escrito,
            procederemos al borrado en un plazo máximo de 30 días naturales,
            salvo obligaciones legales de conservación que pudieran aplicar
            (por ejemplo, registros de operaciones de pago durante los plazos
            fiscales legales). Tras la eliminación, conservaremos
            exclusivamente los datos mínimos necesarios para acreditar el
            cumplimiento de obligaciones legales.
          </p>
        </Block>

        <Block title="5. Destinatarios y proveedores">
          <p>
            Para prestar el servicio nos apoyamos en proveedores
            tecnológicos que actúan como encargados del tratamiento. Todos
            cumplen con el RGPD y firmamos con cada uno los contratos de
            encargo correspondientes:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6 not-italic">
            <li>
              <strong className="font-semibold">Supabase (Estados Unidos / UE):</strong>{" "}
              base de datos y autenticación. Servidores en la región
              europea.
            </li>
            <li>
              <strong className="font-semibold">Vercel (Estados Unidos):</strong>{" "}
              alojamiento de la aplicación y entrega de contenido.
            </li>
            <li>
              <strong className="font-semibold">Cloudflare (Estados Unidos):</strong>{" "}
              red de distribución de contenido, seguridad y protección
              frente a bots.
            </li>
            <li>
              <strong className="font-semibold">Sentry (Estados Unidos):</strong>{" "}
              monitorización de errores técnicos.
            </li>
            <li>
              <strong className="font-semibold">Telegram (Reino Unido / UAE):</strong>{" "}
              notificaciones internas al administrador. No comparte datos
              de usuarios — sólo eventos resumidos para nuestra operativa.
            </li>
            <li>
              <strong className="font-semibold">Google (Estados Unidos):</strong>{" "}
              autenticación OAuth. Únicamente datos básicos de perfil
              (email, nombre, avatar).
            </li>
          </ul>
          <p className="mt-3">
            No vendemos ni cedemos tus datos a terceros con fines
            comerciales.
          </p>
        </Block>

        <Block title="6. Transferencias internacionales">
          <p>
            Algunos proveedores listados arriba están establecidos fuera del
            Espacio Económico Europeo. Las transferencias se amparan en las
            decisiones de adecuación de la Comisión Europea o en las
            Cláusulas Contractuales Tipo (SCC) aprobadas por la propia
            Comisión, garantizando un nivel de protección equivalente al
            del RGPD.
          </p>
        </Block>

        <Block title="7. Tus derechos">
          <p>
            Puedes ejercer en cualquier momento los siguientes derechos
            sobre tus datos personales:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6 not-italic">
            <li><strong className="font-semibold">Acceso:</strong> saber qué datos tenemos sobre ti.</li>
            <li><strong className="font-semibold">Rectificación:</strong> corregir datos inexactos.</li>
            <li><strong className="font-semibold">Supresión:</strong> borrado de tu cuenta y datos asociados.</li>
            <li><strong className="font-semibold">Oposición:</strong> oponerte al tratamiento basado en interés legítimo.</li>
            <li><strong className="font-semibold">Limitación:</strong> restringir el uso de tus datos.</li>
            <li><strong className="font-semibold">Portabilidad:</strong> recibir tus datos en formato estructurado.</li>
            <li><strong className="font-semibold">Retirar consentimiento:</strong> cuando el tratamiento se base en él.</li>
          </ul>
          <p className="mt-3">
            Para ejercer cualquiera de ellos, envía un email a{" "}
            <a
              href={`mailto:${LEGAL_OWNER.email}`}
              className="text-[var(--color-arena)] underline-offset-2 hover:underline"
            >
              {LEGAL_OWNER.email}
            </a>{" "}
            indicando tu solicitud y aportando una copia de tu DNI o
            documento equivalente para acreditar tu identidad. Responderemos
            en un plazo máximo de 30 días naturales.
          </p>
          <p className="mt-3">
            Si consideras que el tratamiento no se ajusta a la normativa,
            tienes derecho a presentar una reclamación ante la{" "}
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-arena)] underline-offset-2 hover:underline"
            >
              Agencia Española de Protección de Datos
            </a>
            .
          </p>
        </Block>

        <Block title="8. Menores de edad">
          <p>
            El Sitio está dirigido a personas mayores de 14 años, conforme a
            la edad mínima establecida en el Art. 7 de la LOPDGDD. No
            recogemos conscientemente datos de menores por debajo de esa
            edad. Si tienes constancia de que un menor de 14 años se ha
            registrado, contáctanos para proceder al borrado inmediato de
            su cuenta.
          </p>
        </Block>

        <Block title="9. Cookies">
          <p>
            El uso de cookies se rige por nuestra{" "}
            <Link
              href="/cookies"
              className="text-[var(--color-arena)] underline-offset-2 hover:underline"
            >
              Política de Cookies
            </Link>
            , disponible en este Sitio.
          </p>
        </Block>

        <Block title="10. Modificación de la política">
          <p>
            Nos reservamos el derecho a modificar esta política para
            adaptarla a cambios legislativos, jurisprudenciales o de
            práctica del Sitio. Las modificaciones entrarán en vigor desde
            su publicación en esta misma página. Te recomendamos revisarla
            periódicamente.
          </p>
        </Block>
      </section>

      <LegalCross current="/privacidad" />
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
    { href: "/cookies", label: "Política de cookies" },
    { href: "/terminos", label: "Términos de uso" },
    { href: "/privacidad", label: "Política de privacidad" },
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
