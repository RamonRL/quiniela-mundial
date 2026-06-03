import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, FileSpreadsheet, Megaphone, Sparkles, Users } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { isPremiumTier } from "@/lib/leagues";
import { PageHeader } from "@/components/shell/page-header";
import { isPaidTier, type PaidTierId } from "@/lib/paddle";

export const metadata = {
  title: "Pago completado",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const TIER_LABEL: Record<PaidTierId, string> = {
  "team-50": "Pase Equipo",
  "team-100": "Pase Empresa",
  "team-250": "Pase Empresa Plus",
};
const TIER_MEMBERS: Record<PaidTierId, string> = {
  "team-50": "hasta 50 miembros",
  "team-100": "hasta 100 miembros",
  "team-250": "hasta 250 miembros",
};

const FEATURES: { icon: React.ReactNode; title: string; text: string }[] = [
  {
    icon: <Users className="size-4" />,
    title: "Más miembros en tu liga",
    text: "Tope ampliado para que entre todo tu grupo sin migrar nada — misma liga, mismos miembros.",
  },
  {
    icon: <Building2 className="size-4" />,
    title: "Departamentos internos",
    text: "Crea sub-grupos (Marketing, Ventas…) que compiten por media de puntos. Opcional.",
  },
  {
    icon: <Sparkles className="size-4" />,
    title: "Logo corporativo",
    text: "Tu logo en la cabecera de la liga para darle identidad de empresa.",
  },
  {
    icon: <Megaphone className="size-4" />,
    title: "Anuncio fijado del organizador",
    text: "Comunica premios internos, fechas o instrucciones a todos los participantes.",
  },
  {
    icon: <FileSpreadsheet className="size-4" />,
    title: "Export CSV del ranking",
    text: "Descarga la clasificación final para entregar premios o compartir resultados.",
  },
  {
    icon: <BadgeCheck className="size-4" />,
    title: "Soporte prioritario",
    text: "Respuesta directa por email durante todo el torneo.",
  },
];

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const sp = await searchParams;
  const tier = sp.tier && isPaidTier(sp.tier) ? (sp.tier as PaidTierId) : null;

  const me = await getCurrentUser();

  // Intentamos leer la liga del comprador para confirmar el upgrade. El
  // webhook es asíncrono: puede que aún no haya procesado, así que lo
  // tratamos como "en curso" si todavía no figura como premium.
  let leagueName: string | null = null;
  let leagueId: number | null = null;
  let alreadyUpgraded = false;
  if (me) {
    const owned = await db
      .select({
        id: leagues.id,
        name: leagues.name,
        tier: leagues.tier,
        isPublic: leagues.isPublic,
        joinCode: leagues.joinCode,
      })
      .from(leagues)
      .where(eq(leagues.createdBy, me.id))
      .limit(5);
    const premium = owned.find((l) => !l.isPublic && isPremiumTier(l.tier));
    if (premium) {
      leagueName = premium.name;
      leagueId = premium.id;
      alreadyUpgraded = true;
    } else {
      const free = owned.find((l) => !l.isPublic && l.joinCode);
      if (free) {
        leagueName = free.name;
        leagueId = free.id;
      }
    }
  }

  const planLabel = tier ? `${TIER_LABEL[tier]} · ${TIER_MEMBERS[tier]}` : "Pase Mundial 2026";

  return (
    <div className="space-y-10">
      {/* Hero de confirmación */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-success)]/40 bg-[color-mix(in_oklch,var(--color-success)_7%,var(--color-surface))] p-8 text-center sm:p-12">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div className="relative space-y-4">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--color-success)] text-white shadow-[var(--shadow-elev-1)]">
            <CheckCircle2 className="size-9" />
          </span>
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
            ¡Pago completado!
          </h1>
          <p className="mx-auto max-w-xl font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)]">
            Gracias por confiar en Quiniela Mundial. Hemos recibido tu{" "}
            <strong className="not-italic font-semibold text-[var(--color-foreground)]">
              {planLabel}
            </strong>
            {leagueName ? (
              <>
                {" "}para la quiniela{" "}
                <strong className="not-italic font-semibold text-[var(--color-foreground)]">
                  {leagueName}
                </strong>
              </>
            ) : null}
            .
          </p>

          {alreadyUpgraded ? (
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--color-success)]/40 bg-[var(--color-surface)] px-4 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-success)]">
              <BadgeCheck className="size-3.5" /> Liga activada
            </p>
          ) : (
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--color-arena)]/40 bg-[var(--color-surface)] px-4 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-arena)]">
              Activando tu liga · suele tardar menos de 1 minuto
            </p>
          )}
        </div>
      </section>

      <PageHeader
        eyebrow="Tu liga ahora incluye"
        title="Todo lo que has desbloqueado"
        description="Estas funciones ya están disponibles en tu quiniela. Las opcionales (como departamentos) las activas cuando quieras desde Mi Quiniela."
      />

      <section className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] text-[var(--color-arena)]">
              {f.icon}
            </span>
            <div className="space-y-0.5">
              <p className="font-display text-base tracking-tight">{f.title}</p>
              <p className="font-editorial text-xs italic leading-snug text-[var(--color-muted-foreground)]">
                {f.text}
              </p>
            </div>
          </article>
        ))}
      </section>

      {/* CTAs */}
      <section className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={leagueId ? "/mi-quiniela" : "/dashboard"}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
        >
          Ir a mi quiniela <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/predicciones"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
        >
          Empezar a predecir
        </Link>
      </section>

      <p className="border-t border-[var(--color-border)] pt-4 text-center font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
        La factura con el IVA llega a tu email de la mano de Paddle. ¿Algo no encaja?{" "}
        <a href="mailto:admin@quinielamundial.es" className="text-[var(--color-arena)]">
          admin@quinielamundial.es
        </a>
      </p>
    </div>
  );
}
