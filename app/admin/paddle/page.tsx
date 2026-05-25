import { AlertTriangle, CheckCircle2, CircleDashed, Info, XCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import {
  PAID_TIERS,
  TIER_AMOUNT_EUR,
  getPaddleClient,
  paddleConfiguredTiers,
  paddlePriceIdForTier,
  paddleWebhookSecret,
  type PaidTierId,
} from "@/lib/paddle";

export const metadata = { title: "Diagnóstico Paddle · Admin" };
export const dynamic = "force-dynamic";

type PriceCheckResult =
  | { tier: PaidTierId; status: "missing"; priceId: null }
  | {
      tier: PaidTierId;
      status: "ok";
      priceId: string;
      productName: string;
      amount: string;
      currency: string;
    }
  | { tier: PaidTierId; status: "error"; priceId: string; error: string };

export default async function PaddleDiagnosticsPage() {
  await requireAdmin();

  const env = process.env.PADDLE_ENV === "live" ? "live" : "sandbox";
  const hasApiKey = !!process.env.PADDLE_API_KEY;
  const hasWebhookSecret = !!paddleWebhookSecret();
  const configured = paddleConfiguredTiers();

  const paddle = getPaddleClient();

  // Para cada price configurado, intenta resolverlo contra el environment
  // actual. Esto detecta mismatches sandbox/live, IDs equivocados o el
  // typo más común: copiar el price_id como product_id.
  const checks: PriceCheckResult[] = [];
  for (const tier of PAID_TIERS) {
    const priceId = paddlePriceIdForTier(tier);
    if (!priceId) {
      checks.push({ tier, status: "missing", priceId: null });
      continue;
    }
    if (!paddle) {
      checks.push({
        tier,
        status: "error",
        priceId,
        error: "Cliente Paddle no inicializado (falta PADDLE_API_KEY).",
      });
      continue;
    }
    try {
      const price = await paddle.prices.get(priceId);
      checks.push({
        tier,
        status: "ok",
        priceId,
        productName: price.name ?? "(sin nombre)",
        amount: price.unitPrice?.amount ?? "?",
        currency: price.unitPrice?.currencyCode ?? "?",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      checks.push({ tier, status: "error", priceId, error: msg });
    }
  }

  const allGreen =
    hasApiKey &&
    hasWebhookSecret &&
    PAID_TIERS.every((t) => configured[t]) &&
    checks.every((c) => c.status === "ok");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Integraciones"
        title="Diagnóstico Paddle"
        description="Verifica que las env vars están configuradas y que los priceIds existen en el environment activo. Esta página NO muestra valores secretos, solo si están o no."
      />

      {/* ─── Estado global ─── */}
      <section
        className={`flex items-start gap-4 rounded-2xl border p-5 ${
          allGreen
            ? "border-[var(--color-success)]/40 bg-[color-mix(in_oklch,var(--color-success)_6%,var(--color-surface))]"
            : "border-[var(--color-warning)]/40 bg-[color-mix(in_oklch,var(--color-warning)_6%,var(--color-surface))]"
        }`}
      >
        {allGreen ? (
          <CheckCircle2 className="size-6 shrink-0 text-[var(--color-success)]" />
        ) : (
          <AlertTriangle className="size-6 shrink-0 text-[var(--color-warning)]" />
        )}
        <div>
          <p className="font-display text-lg tracking-tight">
            {allGreen ? "Todo listo · Paddle operativo" : "Faltan piezas para operar"}
          </p>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {allGreen
              ? `Environment: ${env}. Los 3 priceIds resuelven correctamente y el webhook secret está presente.`
              : "Revisa los puntos en rojo abajo. Cualquier fallo aquí hace que /api/checkout/[tier] caiga al fallback /precios#contacto."}
          </p>
        </div>
      </section>

      {/* ─── Env vars básicas ─── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-tight">Env vars</h2>
        <ul className="space-y-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <EnvRow name="PADDLE_ENV" value={env} hint="sandbox o live" />
          <EnvRow
            name="PADDLE_API_KEY"
            value={hasApiKey ? "set" : "missing"}
            ok={hasApiKey}
          />
          <EnvRow
            name="PADDLE_WEBHOOK_SECRET"
            value={hasWebhookSecret ? "set" : "missing"}
            ok={hasWebhookSecret}
          />
          <EnvRow
            name="PADDLE_PRICE_TEAM_50"
            value={configured["team-50"] ? "set" : "missing"}
            ok={configured["team-50"]}
          />
          <EnvRow
            name="PADDLE_PRICE_TEAM_100"
            value={configured["team-100"] ? "set" : "missing"}
            ok={configured["team-100"]}
          />
          <EnvRow
            name="PADDLE_PRICE_TEAM_250"
            value={configured["team-250"] ? "set" : "missing"}
            ok={configured["team-250"]}
          />
        </ul>
        <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          Si alguna está en <code>missing</code>: añádela en Vercel → Project Settings → Environment Variables → todos los environments → Redeploy.
        </p>
      </section>

      {/* ─── Verificación de priceIds contra Paddle API ─── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-tight">
          Resolución de priceIds en Paddle ({env})
        </h2>
        <div className="grid gap-3">
          {checks.map((c) => (
            <PriceRow key={c.tier} check={c} />
          ))}
        </div>
        <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          Si un priceId existe pero el environment es el equivocado, vendrá un error tipo &quot;not_found&quot;. Verifica que los IDs son del mismo
          environment que <code>PADDLE_ENV</code>.
        </p>
      </section>

      {/* ─── Cómo arreglar ─── */}
      {!allGreen ? (
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <header className="flex items-center gap-2">
            <Info className="size-4 text-[var(--color-arena)]" />
            <h2 className="font-display text-lg tracking-tight">Cómo arreglarlo</h2>
          </header>
          <ol className="mt-4 list-decimal space-y-2 pl-6 font-editorial text-sm leading-relaxed text-[var(--color-foreground)]">
            <li>
              Asegúrate de estar en el environment correcto en Paddle dashboard
              (toggle arriba-izquierda: <strong>Sandbox</strong> o <strong>Live</strong>) y que coincide con tu <code>PADDLE_ENV</code>.
            </li>
            <li>
              Recopila los <code>pri_xxx</code> de los 3 prices (Catalog → Products → cada producto → tab Prices).
            </li>
            <li>
              En Vercel pega cada uno en su env var. <em>Importante</em>: las env vars
              tienen que estar marcadas para <strong>todos</strong> los environments
              (Production, Preview, Development) o solo aplicarán al que elijas.
            </li>
            <li>
              <strong>Redeploy</strong> (no es suficiente con guardar las env vars —
              Next.js las inyecta en build).
            </li>
            <li>
              Vuelve a esta página para confirmar que está todo en verde.
            </li>
          </ol>
        </section>
      ) : null}

      {/* ─── Resumen tiers ─── */}
      <section className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
          Recordatorio · precios esperados
        </p>
        <ul className="space-y-1 font-mono text-xs">
          {PAID_TIERS.map((t) => (
            <li key={t}>
              <code>{t}</code> → {TIER_AMOUNT_EUR[t]} €
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function EnvRow({
  name,
  value,
  ok,
  hint,
}: {
  name: string;
  value: string;
  ok?: boolean;
  hint?: string;
}) {
  const isMissing = ok === false;
  return (
    <li className="flex items-center justify-between gap-3 border-b border-[var(--color-border)]/50 pb-1.5 last:border-0 last:pb-0">
      <span className="font-mono text-xs">{name}</span>
      <span className="flex items-center gap-2">
        {hint ? (
          <span className="font-editorial text-[0.65rem] italic text-[var(--color-muted-foreground)]">
            {hint}
          </span>
        ) : null}
        <span
          className={`inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] ${
            isMissing
              ? "text-[var(--color-danger)]"
              : ok === true
                ? "text-[var(--color-success)]"
                : "text-[var(--color-muted-foreground)]"
          }`}
        >
          {isMissing ? (
            <XCircle className="size-3" />
          ) : ok === true ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <CircleDashed className="size-3" />
          )}
          {value}
        </span>
      </span>
    </li>
  );
}

function PriceRow({ check }: { check: PriceCheckResult }) {
  if (check.status === "ok") {
    const amountEur = (Number(check.amount) / 100).toLocaleString("es-ES", {
      minimumFractionDigits: 2,
    });
    return (
      <article className="flex items-start gap-3 rounded-xl border border-[var(--color-success)]/40 bg-[color-mix(in_oklch,var(--color-success)_5%,var(--color-surface))] p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--color-success)]" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base tracking-tight">{check.tier}</p>
          <p className="truncate font-mono text-[0.65rem] text-[var(--color-muted-foreground)]">
            {check.priceId}
          </p>
          <p className="mt-1 font-editorial text-sm italic">
            {check.productName} · {amountEur} {check.currency}
          </p>
        </div>
      </article>
    );
  }
  if (check.status === "missing") {
    return (
      <article className="flex items-start gap-3 rounded-xl border border-[var(--color-danger)]/40 bg-[color-mix(in_oklch,var(--color-danger)_5%,var(--color-surface))] p-4">
        <XCircle className="mt-0.5 size-5 shrink-0 text-[var(--color-danger)]" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base tracking-tight">{check.tier}</p>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Env var ausente — el botón Comprar cae al fallback.
          </p>
        </div>
      </article>
    );
  }
  return (
    <article className="flex items-start gap-3 rounded-xl border border-[var(--color-danger)]/40 bg-[color-mix(in_oklch,var(--color-danger)_5%,var(--color-surface))] p-4">
      <XCircle className="mt-0.5 size-5 shrink-0 text-[var(--color-danger)]" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-base tracking-tight">{check.tier}</p>
        <p className="truncate font-mono text-[0.65rem] text-[var(--color-muted-foreground)]">
          {check.priceId}
        </p>
        <p className="mt-1 break-words font-editorial text-sm italic text-[var(--color-danger)]">
          {check.error}
        </p>
      </div>
    </article>
  );
}
