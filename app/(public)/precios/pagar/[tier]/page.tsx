import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { isPremiumTier } from "@/lib/leagues";
import { PAYMENT_METHODS, paymentConcept } from "@/lib/payment-methods";
import { PageHeader } from "@/components/shell/page-header";
import { TIER_LABEL, TIER_MEMBERS, TIER_PRICE_EUR, isPaidTier } from "./tier-meta";
import { PayManualForm } from "./pay-manual-form";

export const dynamic = "force-dynamic";

type EligibleLeague = { name: string; joinCode: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  if (!isPaidTier(tier)) return { title: "Pagar plan" };
  return {
    title: `Pagar ${TIER_LABEL[tier]} · ${TIER_PRICE_EUR[tier]} €`,
    robots: { index: false, follow: false },
  };
}

export default async function PagarTierPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  if (!isPaidTier(tier)) notFound();
  const priceEur = TIER_PRICE_EUR[tier];

  const me = await getCurrentUser();

  // Resolución de la liga elegible — copia de la lógica de
  // /api/me/buyer-context, pero server-side para evitar el flicker.
  let eligibleLeague: EligibleLeague | null = null;
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
      eligibleLeague = { name: eligible[0].name, joinCode: eligible[0].joinCode };
    }
  }

  const concept = paymentConcept(tier, eligibleLeague?.joinCode ?? null);

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
        title={`Pago manual · ${priceEur} €`}
        description="Pago único por el Mundial 2026 — sin renovación. Activamos tu plan en menos de 24h verificado el ingreso."
      />

      {/* ─── Resumen del pedido ─── */}
      <section className="rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
              Tu pedido
            </p>
            <p className="mt-1 font-display text-2xl tracking-tight">
              {TIER_LABEL[tier]} · {TIER_MEMBERS[tier]}
            </p>
            {eligibleLeague ? (
              <p className="mt-1 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                Asociado a tu liga <strong className="not-italic font-medium">{eligibleLeague.name}</strong>{" "}
                (código <code className="font-mono text-[var(--color-arena)]">{eligibleLeague.joinCode}</code>).
              </p>
            ) : me ? (
              <p className="mt-1 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                Aún no tienes una quiniela privada en tu cuenta — créala primero o indícala en el email del comprobante.
              </p>
            ) : (
              <p className="mt-1 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                Sin sesión iniciada. Puedes pagar igualmente, pero asocia el pago a tu cuenta más rápido si{" "}
                <Link href="/login?next=/precios/pagar/" className="text-[var(--color-arena)] underline">
                  inicias sesión
                </Link>{" "}
                antes.
              </p>
            )}
          </div>
          <p className="font-display tabular text-4xl tracking-tight text-[var(--color-arena)] glow-arena">
            {priceEur} €
          </p>
        </div>
      </section>

      {/* ─── Métodos de pago ─── */}
      <section className="space-y-4">
        <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Cómo pagar
          </h2>
        </header>

        <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
          Elige el método que prefieras. Usa siempre este concepto en la transferencia / Bizum / nota de PayPal para que podamos casarlo con tu pedido:
        </p>

        <div className="rounded-md border border-[var(--color-arena)]/40 bg-[var(--color-bg)] p-4">
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
            Concepto del pago
          </p>
          <p className="mt-1 font-mono text-lg tracking-[0.18em] text-[var(--color-arena)]">
            {concept}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Bizum */}
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
              Bizum
            </p>
            <p className="mt-2 font-display text-xl tracking-tight">
              {PAYMENT_METHODS.bizum.phone}
            </p>
            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              {PAYMENT_METHODS.bizum.holder}
            </p>
            <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Lo más rápido si pagas desde España.
            </p>
          </article>

          {/* Transferencia / IBAN */}
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
              Transferencia
            </p>
            <p className="mt-2 break-all font-mono text-sm">
              {PAYMENT_METHODS.bank.iban}
            </p>
            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              {PAYMENT_METHODS.bank.holder}
            </p>
            <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Recomendado para empresas. Tarda 1-2 días hábiles.
            </p>
          </article>

          {/* PayPal */}
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
              PayPal
            </p>
            <p className="mt-2 font-mono text-sm">{PAYMENT_METHODS.paypal.email}</p>
            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              Envía como &quot;Amigos y familia&quot; o &quot;Compra de bienes&quot; según prefieras.
            </p>
            <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Útil para pagos internacionales.
            </p>
          </article>
        </div>
      </section>

      {/* ─── Confirmar pago ─── */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <header className="space-y-1.5">
          <h2 className="font-display text-2xl tracking-tight">¿Ya has hecho el ingreso?</h2>
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
            Confirma el método elegido y abrimos tu cliente de correo con el mensaje pre-formateado para que solo tengas que adjuntar el comprobante.
          </p>
        </header>
        <div className="mt-6">
          <PayManualForm
            tier={tier}
            priceEur={priceEur}
            initialLeagueCode={eligibleLeague?.joinCode ?? null}
            initialName={me?.nickname ?? null}
            initialEmail={me?.email ?? null}
          />
        </div>
      </section>

      <p className="border-t border-[var(--color-border)] pt-4 text-center font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
        ¿Dudas antes de pagar?{" "}
        <Link href="/precios#contacto" className="text-[var(--color-arena)]">
          <Mail className="inline size-3" /> Pregúntanos
        </Link>{" "}
        <ArrowRight className="inline size-3" />
      </p>
    </div>
  );
}
