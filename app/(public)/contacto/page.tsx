import Image from "next/image";
import Link from "next/link";
import { Briefcase, Bug, Lightbulb, Mail, MessageSquare } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { InstagramIcon, TikTokIcon, XIcon } from "@/components/icons/social";
import { CommercialLeadForm } from "@/components/leagues/commercial-lead-form";

// Contacto es estático: cacheamos generosamente (24 h).
export const revalidate = 86400;

export const metadata = {
  title: "Contacto",
  description:
    "Contacto de Quiniela Mundial 2026. Bugs, mejoras, dudas o planes para empresas: admin@quinielamundial.es.",
  alternates: { canonical: "/contacto" },
  openGraph: {
    title: "Contacto · Quiniela Mundial 2026",
    description:
      "Contacto de Quiniela Mundial 2026. Email, redes sociales y formulario para empresas.",
    url: "/contacto",
  },
};

const EMAIL = "admin@quinielamundial.es";

// Redes sociales — los handles los rellena el dueño cuando estén
// creados. Mantén el array para que la sección renderice un link por
// item; basta cambiar el href para activarlos. Si no hay redes todavía,
// pon el array vacío y la sección se oculta sola.
type Social = {
  label: string;
  href: string;
  handle: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const SOCIALS: Social[] = [
  {
    label: "Instagram",
    href: "https://instagram.com/quinimundial",
    handle: "@quinimundial",
    Icon: InstagramIcon,
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@quinielamundial",
    handle: "@quinielamundial",
    Icon: TikTokIcon,
  },
  {
    label: "X (Twitter)",
    href: "https://x.com/QMundial2026",
    handle: "@QMundial2026",
    Icon: XIcon,
  },
];

export default function ContactoPage() {
  return (
    <div className="space-y-12">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Contacto", href: "/contacto" },
        ]}
      />

      <PageHeader
        eyebrow="Ayuda"
        title="Contacto"
        description="Bugs, mejoras o cualquier asunto — te respondemos lo antes posible."
      />

      {/* ─── Email hero ─── */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] p-8 sm:p-12">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.06]"
        />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
            <Mail className="size-5" />
          </span>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
            Email
          </p>
          <a
            href={`mailto:${EMAIL}`}
            className="font-display text-3xl tracking-tight text-[var(--color-foreground)] underline-offset-4 hover:underline sm:text-5xl"
          >
            {EMAIL}
          </a>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Click para abrir tu cliente de correo.
          </p>
        </div>
      </section>

      {/* ─── Sobre el proyecto ─── */}
      <section className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-10">
        {/* Pareja de círculos: retrato + mark de la app, ligeramente
            solapados para sugerir "persona + proyecto". El retrato
            delante porque pesa más como elemento visual. */}
        <div className="flex justify-center lg:block">
          <div className="relative flex items-center">
            <div className="relative z-10 size-32 overflow-hidden rounded-full border-2 border-[var(--color-arena)]/40 bg-[var(--color-surface)] shadow-[var(--shadow-elev-2)]">
              <Image
                src="/yo-portrait.jpg"
                alt="Creador de Quiniela Mundial"
                width={640}
                height={640}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="-ml-6 size-24 overflow-hidden rounded-full border-2 border-[var(--color-arena)]/40 bg-[var(--color-surface)] shadow-[var(--shadow-elev-2)]">
              <Image
                src="/qm-mark.png"
                alt="Quiniela Mundial"
                width={940}
                height={973}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Sobre el proyecto
          </p>
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Hecho por un aficionado, para aficionados.
          </h2>
          <p className="font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-lg">
            Quiniela Mundial nació para un grupo de amigos, como alternativa
            a los juegos fantasy tradicionales — excels infinitos, capturas
            en el grupo de WhatsApp, batallas de clausulazos sin control y
            siempre con la sensación de echar en falta una experiencia mejor.
            Decidimos construir la app que nos faltaba y abrirla para que la
            usara cualquiera.
          </p>
          <p className="font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-lg">
            Si te encuentras un bug, tienes una idea, quieres sugerir una
            categoría nueva o solo dar feedback, escribe a{" "}
            <a
              href={`mailto:${EMAIL}`}
              className="text-[var(--color-arena)] underline-offset-2 hover:underline"
            >
              {EMAIL}
            </a>
            . No hay un equipo grande detrás, así que puede tardar un día o
            dos en responder, pero leemos todo.
          </p>
        </div>
      </section>

      {/* ─── Atajos de email ─── */}
      <section className="space-y-4">
        <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Por qué escribir
          </h2>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          <ContactCard
            icon={<Bug className="size-5" />}
            title="Bugs"
            text="Algo no funciona o se ve raro. Cuéntame qué pasó y, si puedes, manda captura."
            href={`mailto:${EMAIL}?subject=${encodeURIComponent("Bug en Quiniela Mundial")}`}
          />
          <ContactCard
            icon={<Lightbulb className="size-5" />}
            title="Mejoras"
            text="Una idea para una categoría nueva, una pantalla, una funcionalidad. Soy todo oídos."
            href={`mailto:${EMAIL}?subject=${encodeURIComponent("Mejora para Quiniela Mundial")}`}
          />
          <ContactCard
            icon={<MessageSquare className="size-5" />}
            title="Otros"
            text="Lo que sea: prensa, colaboraciones, dudas legales, peticiones de borrado."
            href={`mailto:${EMAIL}?subject=${encodeURIComponent("Quiniela Mundial · ")}`}
          />
        </div>
      </section>

      {/* ─── Empresas / grupos grandes ─── */}
      <section
        id="empresas"
        className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-8 sm:p-10"
      >
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div className="relative grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-10">
          <div className="space-y-2">
            <span className="inline-flex size-10 items-center justify-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
              <Briefcase className="size-5" />
            </span>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
              Empresas y grupos grandes
            </p>
            <h2 className="font-display text-3xl tracking-tight">
              ¿Tu empresa lo quiere usar?
            </h2>
            <p className="max-w-md font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)]">
              Las quinielas privadas aguantan 20 personas en plan Free. Para
              equipos más grandes mira{" "}
              <Link
                href="/precios"
                className="text-[var(--color-arena)] underline-offset-2 hover:underline"
              >
                /precios
              </Link>{" "}
              o rellena el formulario y te respondemos en menos de 24 h.
            </p>
          </div>
          <CommercialLeadForm />
        </div>
      </section>

      {/* ─── Redes sociales ─── */}
      {SOCIALS.length > 0 ? (
        <section className="space-y-4">
          <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
            <span className="h-px w-6 bg-[var(--color-arena)]" />
            <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Redes sociales
            </h2>
          </header>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOCIALS.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-arena)]/40"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
                  <s.Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base tracking-tight">
                    {s.label}
                  </p>
                  <p className="truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    {s.handle}
                  </p>
                </div>
                <span
                  aria-hidden
                  className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)] transition group-hover:translate-x-0.5"
                >
                  ↗
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ContactCard({
  icon,
  title,
  text,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-arena)]/40"
    >
      <span className="grid size-9 place-items-center rounded-md border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] text-[var(--color-arena)]">
        {icon}
      </span>
      <h3 className="font-display text-lg tracking-tight">{title}</h3>
      <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
        {text}
      </p>
      <span className="mt-auto font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-arena)] transition group-hover:translate-x-0.5">
        Escribir →
      </span>
    </a>
  );
}
