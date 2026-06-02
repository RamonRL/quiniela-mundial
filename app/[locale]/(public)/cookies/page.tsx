import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

export const revalidate = 86400;

export const metadata = {
  title: "Política de cookies",
  description:
    "Política de cookies de Quiniela Mundial 2026. Tipos de cookies que utilizamos, finalidad, duración y cómo gestionarlas.",
  alternates: { canonical: "/cookies" },
  robots: { index: true, follow: true },
};

type Cookie = {
  name: string;
  owner: string;
  purpose: string;
  type: "Sesión" | "Persistente";
  duration: string;
  category: "Necesaria" | "Funcional" | "Seguridad";
};

const COOKIES: Cookie[] = [
  {
    name: "sb-*-auth-token",
    owner: "Supabase",
    purpose: "Mantener la sesión iniciada del usuario.",
    type: "Persistente",
    duration: "1 año",
    category: "Necesaria",
  },
  {
    name: "sb-*-auth-token-code-verifier",
    owner: "Supabase",
    purpose: "Verificación PKCE durante el flujo de login con Google.",
    type: "Sesión",
    duration: "10 minutos",
    category: "Necesaria",
  },
  {
    name: "pending_league_token",
    owner: "Quiniela Mundial",
    purpose:
      "Guardar la invitación a una quiniela privada cuando un usuario aún no ha iniciado sesión, para aplicarla tras el login.",
    type: "Persistente",
    duration: "24 horas",
    category: "Funcional",
  },
  {
    name: "sidebar_collapsed",
    owner: "Quiniela Mundial",
    purpose: "Recordar si el usuario tiene la barra lateral plegada.",
    type: "Persistente",
    duration: "1 año",
    category: "Funcional",
  },
  {
    name: "__cf_bm",
    owner: "Cloudflare",
    purpose:
      "Detección de tráfico de bots y protección frente a abusos automatizados.",
    type: "Persistente",
    duration: "30 minutos",
    category: "Seguridad",
  },
  {
    name: "cf_clearance",
    owner: "Cloudflare",
    purpose:
      "Verificación de que el visitante ha pasado un challenge de seguridad.",
    type: "Persistente",
    duration: "1 año",
    category: "Seguridad",
  },
];

export default function CookiesPage() {
  return (
    <div className="space-y-12">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Política de cookies", href: "/cookies" },
        ]}
      />

      <PageHeader
        eyebrow="Legal"
        title="Política de cookies"
        description={`Última actualización: ${LEGAL_LAST_UPDATED}.`}
      />

      <section className="space-y-10 font-editorial text-[0.95rem] leading-relaxed text-[var(--color-foreground)] sm:text-base">
        <Block title="1. Qué son las cookies">
          <p>
            Las cookies son pequeños archivos de texto que un sitio web
            descarga en tu dispositivo (ordenador, móvil o tablet) cuando
            lo visitas. Sirven para recordar información sobre tu visita,
            mantener tu sesión iniciada, o garantizar la seguridad del
            servicio.
          </p>
        </Block>

        <Block title="2. Cookies que utilizamos">
          <p>
            En Quiniela Mundial utilizamos únicamente cookies{" "}
            <strong className="font-semibold not-italic">técnicas</strong>{" "}
            (necesarias para el funcionamiento básico del Sitio) y{" "}
            <strong className="font-semibold not-italic">funcionales</strong>{" "}
            (que recuerdan preferencias del usuario). En este momento{" "}
            <strong className="font-semibold not-italic">
              NO utilizamos cookies analíticas, publicitarias ni de
              terceros con finalidad comercial
            </strong>{" "}
            (no usamos Google Analytics, ni Meta Pixel, ni similares).
          </p>

          <div className="not-italic mt-6 overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-[var(--color-surface-2)] text-left">
                <tr>
                  <th className="px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Cookie
                  </th>
                  <th className="px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Origen
                  </th>
                  <th className="px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Categoría
                  </th>
                  <th className="px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Duración
                  </th>
                  <th className="px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Finalidad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {COOKIES.map((c) => (
                  <tr key={c.name}>
                    <td className="px-3 py-2 align-top">
                      <code className="font-mono text-xs">{c.name}</code>
                    </td>
                    <td className="px-3 py-2 align-top text-xs">{c.owner}</td>
                    <td className="px-3 py-2 align-top text-xs">{c.category}</td>
                    <td className="px-3 py-2 align-top text-xs">{c.duration}</td>
                    <td className="px-3 py-2 align-top text-xs leading-relaxed">
                      {c.purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>

        <Block title="3. Consentimiento">
          <p>
            Conforme al artículo 22.2 de la LSSI-CE, las cookies
            estrictamente necesarias para prestar el servicio solicitado
            por el usuario (en nuestro caso: las de sesión, las de
            seguridad de Cloudflare y la cookie de invitación a quiniela
            privada) están exentas del requisito de consentimiento
            informado.
          </p>
          <p className="mt-3">
            Las cookies funcionales (preferencias de interfaz) se instalan
            tras iniciar sesión y se entiende que aceptas su uso al
            utilizar la aplicación logueada. Puedes desactivarlas en
            cualquier momento siguiendo las instrucciones del apartado
            siguiente.
          </p>
        </Block>

        <Block title="4. Cómo gestionar o eliminar las cookies">
          <p>
            Puedes permitir, bloquear o eliminar las cookies instaladas en
            tu dispositivo desde la configuración de tu navegador. Cada
            navegador tiene su procedimiento:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6 not-italic">
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-arena)] underline-offset-2 hover:underline"
              >
                Google Chrome
              </a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/es/kb/Borrar%20cookies"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-arena)] underline-offset-2 hover:underline"
              >
                Mozilla Firefox
              </a>
            </li>
            <li>
              <a
                href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-arena)] underline-offset-2 hover:underline"
              >
                Safari
              </a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-arena)] underline-offset-2 hover:underline"
              >
                Microsoft Edge
              </a>
            </li>
          </ul>
          <p className="mt-3">
            Ten en cuenta que si bloqueas las cookies necesarias el Sitio
            puede dejar de funcionar correctamente (por ejemplo, no
            podrás iniciar sesión).
          </p>
        </Block>

        <Block title="5. Modificación de la política">
          <p>
            Nos reservamos el derecho a modificar esta política cuando
            varíen las cookies utilizadas o lo exija la normativa. La
            versión vigente es la publicada en esta página.
          </p>
        </Block>
      </section>

      <LegalCross current="/cookies" />
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
    { href: "/terminos", label: "Términos de uso" },
    { href: "/cookies", label: "Política de cookies" },
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
