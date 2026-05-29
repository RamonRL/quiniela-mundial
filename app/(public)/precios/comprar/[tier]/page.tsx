import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LogIn, Plus, ShieldCheck, Trophy } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { isPremiumTier } from "@/lib/leagues";
import {
  TIER_AMOUNT_EUR,
  isPaidTier,
  type PaidTierId,
} from "@/lib/paddle";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Comprar pase",
  robots: { index: false, follow: false },
};

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

/**
 * Gateway entre el botón "Comprar" de /precios y el checkout de Paddle.
 * Cierra el agujero por el que entró Salvador: nadie llega a pagar sin tener
 * antes una cuenta + una liga elegible explícitamente seleccionada.
 *
 * Cuatro caminos según el estado del visitante:
 *  - Sin sesión → "inicia sesión" con next= que les devuelve aquí.
 *  - Logueado sin ninguna liga propia → "crea una primero" con next= al onboarding.
 *  - Logueado, todas sus ligas ya son premium → "crea otra" con next=.
 *  - Logueado con N ligas elegibles → picker con radios + submit a /api/checkout.
 *
 * El endpoint /api/checkout/[tier] ya no adivina la liga: la recibe en
 * query string (`?league=ABC123`) y la valida.
 */
export default async function PrecioComprarPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  if (!isPaidTier(tier)) redirect("/precios");
  const tierId = tier as PaidTierId;
  const tierLabel = TIER_LABEL[tierId];
  const tierMembers = TIER_MEMBERS[tierId];
  const tierAmount = TIER_AMOUNT_EUR[tierId];
  const backHref = `/precios/comprar/${tierId}`;

  const me = await getCurrentUser();

  // CASO A: sin sesión → toca login antes que nada.
  if (!me) {
    return (
      <Layout tier={tierLabel} amount={tierAmount} members={tierMembers}>
        <StepCard
          eyebrow="Paso 1 de 3"
          icon={<LogIn className="size-5" />}
          title="Inicia sesión para continuar"
          description="Antes de pagar necesitamos saber a quién va el pase. Usa tu cuenta Google o el código por email — sin contraseñas."
          ctaLabel="Continuar al login"
          ctaHref={`/login?next=${encodeURIComponent(backHref)}`}
        />
      </Layout>
    );
  }

  // Cargamos las ligas creadas por el usuario para clasificar el resto de
  // casos. `createdBy` es propietario único — solo el dueño puede aplicar
  // un pase a su quiniela.
  const owned = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      tier: leagues.tier,
      isPublic: leagues.isPublic,
      joinCode: leagues.joinCode,
    })
    .from(leagues)
    .where(eq(leagues.createdBy, me.id));

  const privateOwned = owned.filter((l) => !l.isPublic && l.joinCode);
  const eligible = privateOwned.filter((l) => !isPremiumTier(l.tier));
  const allPremium = privateOwned.length > 0 && eligible.length === 0;

  // CASO B/D: logueado pero sin ligas elegibles → toca crear una.
  if (eligible.length === 0) {
    const reasonTitle = allPremium
      ? "Todas tus quinielas ya tienen pase"
      : "Antes de pagar, crea tu quiniela";
    const reasonDescription = allPremium
      ? `Las quinielas que has creado ya están en un pase premium. Si quieres aplicar el ${tierLabel} a una nueva quiniela, créala primero y te traemos aquí de vuelta.`
      : `Necesitas una quiniela propia para aplicarle el pase. Te llevamos a crearla en 30 segundos y vuelves aquí automáticamente.`;
    return (
      <Layout tier={tierLabel} amount={tierAmount} members={tierMembers}>
        <StepCard
          eyebrow="Paso 2 de 3"
          icon={<Plus className="size-5" />}
          title={reasonTitle}
          description={reasonDescription}
          ctaLabel={allPremium ? "Crear otra quiniela" : "Crear mi quiniela"}
          ctaHref={`/onboarding?step=privada-crear&next=${encodeURIComponent(backHref)}`}
        />
      </Layout>
    );
  }

  // CASO C: 1+ ligas elegibles → selector + submit GET a /api/checkout.
  return (
    <Layout tier={tierLabel} amount={tierAmount} members={tierMembers}>
      <form action={`/api/checkout/${tierId}`} method="get" className="space-y-4">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          Paso 3 de 3 · Elige la quiniela a mejorar
        </p>
        <ul className="space-y-2">
          {eligible.map((l, idx) => (
            <li key={l.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 transition has-[input:checked]:border-[var(--color-arena)] has-[input:checked]:bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface-2))]">
                <input
                  type="radio"
                  name="league"
                  value={l.joinCode ?? ""}
                  defaultChecked={idx === 0}
                  required
                  className="size-4 accent-[var(--color-arena)]"
                />
                <Trophy className="size-4 text-[var(--color-muted-foreground)]" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base tracking-tight">{l.name}</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Código <span className="text-[var(--color-arena)]">{l.joinCode}</span>
                    {" · "}plan actual: {l.tier === "free" ? "gratis" : l.tier}
                  </p>
                </div>
              </label>
            </li>
          ))}
        </ul>
        <Button type="submit" size="lg" className="w-full">
          Pagar {tierAmount} € por la quiniela seleccionada
          <ArrowRight className="size-4" />
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          <ShieldCheck className="size-3" />
          Pago seguro via Paddle (Merchant of Record)
        </p>
      </form>
    </Layout>
  );
}

// ───────────────────────── presentational helpers ─────────────────────────

function Layout({
  tier,
  amount,
  members,
  children,
}: {
  tier: string;
  amount: number;
  members: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="space-y-2 text-center">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
          Quiniela · Mundial · 2026
        </p>
        <h1 className="font-display text-4xl tracking-tight">{tier}</h1>
        <p className="font-editorial text-base italic text-[var(--color-muted-foreground)]">
          {amount} € · {members} · pago único
        </p>
      </div>
      <div className="mt-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        {children}
      </div>
      <p className="mt-6 text-center font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        <Link href="/precios" className="hover:text-[var(--color-foreground)]">
          ← Volver a planes
        </Link>
      </p>
    </div>
  );
}

function StepCard({
  eyebrow,
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="space-y-5 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)] text-[var(--color-arena)]">
        {icon}
      </span>
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {eyebrow}
      </p>
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
        {description}
      </p>
      <Button asChild size="lg" className="w-full">
        <Link href={ctaHref}>
          {ctaLabel} <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
