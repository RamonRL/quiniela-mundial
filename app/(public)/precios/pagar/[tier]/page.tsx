import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Mail, ShieldCheck } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { isPremiumTier } from "@/lib/leagues";
import { PageHeader } from "@/components/shell/page-header";
import { CommercialLeadForm } from "@/components/leagues/commercial-lead-form";
import {
  TIER_LABEL,
  TIER_MEMBERS,
  TIER_PRICE_EUR,
  isPaidTier,
  type PaidTier,
} from "./tier-meta";

export const dynamic = "force-dynamic";

const TIER_MEMBERS_INT: Record<string, number> = {
  "team-50": 50,
  "team-100": 100,
  "team-250": 250,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  if (!isPaidTier(tier)) return { title: "Contratar plan" };
  return {
    title: `Contratar ${TIER_LABEL[tier]} · ${TIER_PRICE_EUR[tier]} €`,
    robots: { index: false, follow: false },
  };
}

export default async function ContratarTierPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  if (!isPaidTier(tier)) notFound();
  const priceEur = TIER_PRICE_EUR[tier];

  const me = await getCurrentUser();

  // Resolvemos la liga elegible del usuario para incluirla en el mensaje
  // del lead. Misma lógica que /api/me/buyer-context.
  let eligibleLeagueCode: string | null = null;
  let eligibleLeagueName: string | null = null;
  if (me) {
    const owned = await db
      .select({
        name: leagues.name,
        joinCode: leagues.joinCode,
        tier: leagues.tier,
        isPublic: leagues.isPublic,
      })
      .from(leagues)
      .where(eq(leagues.createdBy, me.id))
      .limit(3);
    const eligible = owned.filter(
      (l) => !l.isPublic && !isPremiumTier(l.tier) && l.joinCode,
    );
    if (eligible.length === 1 && eligible[0].joinCode) {
      eligibleLeagueCode = eligible[0].joinCode;
      eligibleLeagueName = eligible[0].name;
    }
  }

  const defaultMessage = buildDefaultMessage({
    tier,
    priceEur,
    leagueCode: eligibleLeagueCode,
    leagueName: eligibleLeagueName,
  });

  return (
    <div className="space-y-10">
      <Link
        href="/precios"
        className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)] hover:text-[var(--color-arena)]"
      >
        <ArrowLeft className="size-3.5" /> Volver a planes
      </Link>

      <PageHeader
        eyebrow={`${TIER_LABEL[tier]} · ${TIER_MEMBERS[tier]}`}
        title={`Solicita el ${TIER_LABEL[tier]}`}
        description="Cuéntame de tu grupo y te respondo en menos de 24 h con los detalles para activarlo y los siguientes pasos."
      />

      {/* ─── Resumen del pedido ─── */}
      <section className="rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
              Tu plan
            </p>
            <p className="mt-1 font-display text-2xl tracking-tight">
              {TIER_LABEL[tier]} · {TIER_MEMBERS[tier]}
            </p>
            <p className="mt-1 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              Pago único por el Mundial 2026 — del 11 de junio al 19 de julio.
            </p>
          </div>
          <p className="font-display tabular text-4xl tracking-tight text-[var(--color-arena)] glow-arena">
            {priceEur} €
          </p>
        </div>
      </section>

      {/* ─── Lo que pasa después ─── */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Step
          n={1}
          icon={<Mail className="size-4" />}
          title="Envías la solicitud"
          text="Rellenas el formulario de abajo en menos de un minuto. Sin compromiso."
        />
        <Step
          n={2}
          icon={<Clock className="size-4" />}
          title="Respondo en &lt;24h"
          text="Te escribo personalmente con las instrucciones de pago y resolvemos cualquier duda que tengas."
        />
        <Step
          n={3}
          icon={<ShieldCheck className="size-4" />}
          title="Se activa tu plan"
          text="Verificado el ingreso, ampliamos el tope de miembros de tu liga sin migrar nada — mismos usuarios, más capacidad."
        />
      </section>

      {/* ─── Lead form ─── */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <header className="space-y-1.5">
          <h2 className="font-display text-2xl tracking-tight">Cuéntame de tu grupo</h2>
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
            Pre-rellené el mensaje con el plan que has elegido para ahorrarte tiempo. Edítalo si quieres añadir contexto.
          </p>
        </header>
        <div className="mt-6">
          <CommercialLeadForm
            defaultMembers={TIER_MEMBERS_INT[tier]}
            defaultMessage={defaultMessage}
          />
        </div>
      </section>

      <p className="border-t border-[var(--color-border)] pt-4 text-center font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
        ¿Prefieres email directo?{" "}
        <a
          className="text-[var(--color-arena)]"
          href="mailto:admin@quinielamundial.es?subject=Solicito%20Pase%20Mundial%202026"
        >
          admin@quinielamundial.es
        </a>
      </p>
    </div>
  );
}

function buildDefaultMessage(input: {
  tier: PaidTier;
  priceEur: number;
  leagueCode: string | null;
  leagueName: string | null;
}): string {
  const lines = [
    `Solicito el ${TIER_LABEL[input.tier]} (${input.priceEur} €).`,
  ];
  if (input.leagueCode && input.leagueName) {
    lines.push(`Mi quiniela ya está creada: "${input.leagueName}" (código ${input.leagueCode}).`);
  } else {
    lines.push("Aún no he creado la quiniela.");
  }
  return lines.join("\n");
}

function Step({
  n,
  icon,
  title,
  text,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full border border-[var(--color-arena)]/40 bg-[var(--color-bg)] font-display text-sm tabular text-[var(--color-arena)]">
          {n}
        </span>
        <span className="text-[var(--color-arena)]">{icon}</span>
      </div>
      <h3
        className="font-display text-base tracking-tight"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <p className="font-editorial text-xs italic leading-snug text-[var(--color-muted-foreground)]">
        {text}
      </p>
    </article>
  );
}
