import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Info,
  Inbox,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { desc, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { commercialLeads } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import { formatDateTime } from "@/lib/utils";
import {
  PAID_TIERS,
  TIER_AMOUNT_EUR,
  getPaddleClient,
  paddleClientToken,
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

type TxTestResult =
  | { status: "not_run" }
  | { status: "skipped"; reason: string }
  | {
      status: "ok";
      txId: string;
      checkoutUrl: string;
    }
  | {
      status: "no_checkout_url";
      txId: string;
    }
  | { status: "error"; error: string };

export default async function PaddleDiagnosticsPage({
  searchParams,
}: {
  searchParams: Promise<{ test?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const runTest = sp.test === "1";

  const env = process.env.PADDLE_ENV === "live" ? "live" : "sandbox";
  const hasApiKey = !!process.env.PADDLE_API_KEY;
  const hasWebhookSecret = !!paddleWebhookSecret();
  const hasClientToken = !!paddleClientToken();
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
    hasClientToken &&
    PAID_TIERS.every((t) => configured[t]) &&
    checks.every((c) => c.status === "ok");

  // Webhooks recibidos: cada transaction.completed que pasa la firma deja
  // un commercial_lead con tag "Tx: PADDLE#...". Si hay registros, el
  // webhook LLEGA y la firma valida (el problema sería upgrade/telegram).
  // Si está vacío tras un pago real → Paddle no entrega o devuelve 401.
  const recentWebhooks = await db
    .select({
      id: commercialLeads.id,
      name: commercialLeads.name,
      email: commercialLeads.email,
      message: commercialLeads.message,
      notes: commercialLeads.notes,
      createdAt: commercialLeads.createdAt,
    })
    .from(commercialLeads)
    .where(like(commercialLeads.notes, "%PADDLE#%"))
    .orderBy(desc(commercialLeads.createdAt))
    .limit(5);

  // Test real de creación de transaction. Solo se dispara con ?test=1
  // para evitar generar transactions cada vez que abres la página. En
  // sandbox no cuesta nada, en live se crearía una transaction real
  // (sin pago, queda en "ready") así que también es segura.
  let txTest: TxTestResult = { status: "not_run" };
  if (runTest) {
    const testTier: PaidTierId = "team-50";
    const testPriceId = paddlePriceIdForTier(testTier);
    if (!paddle || !testPriceId) {
      txTest = {
        status: "skipped",
        reason: !paddle
          ? "Cliente Paddle no inicializado."
          : "Sin priceId para team-50.",
      };
    } else {
      try {
        const tx = await paddle.transactions.create({
          items: [{ priceId: testPriceId, quantity: 1 }],
          customData: { test: "admin-diagnostic" },
        });
        const checkoutUrl = tx.checkout?.url;
        if (checkoutUrl) {
          txTest = { status: "ok", txId: tx.id, checkoutUrl };
        } else {
          txTest = { status: "no_checkout_url", txId: tx.id };
        }
      } catch (err) {
        txTest = {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }

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

      {/* ─── Webhooks recibidos ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl tracking-tight">Webhooks recibidos</h2>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            últimos 5
          </span>
        </div>
        {recentWebhooks.length === 0 ? (
          <article className="flex items-start gap-3 rounded-xl border border-[var(--color-warning)]/40 bg-[color-mix(in_oklch,var(--color-warning)_5%,var(--color-surface))] p-4">
            <Inbox className="mt-0.5 size-5 shrink-0 text-[var(--color-warning)]" />
            <div className="space-y-1.5">
              <p className="font-display text-base tracking-tight">
                Ningún webhook procesado todavía
              </p>
              <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
                Si ya hiciste un pago de prueba y esto sigue vacío, Paddle{" "}
                <strong className="not-italic font-semibold">no está entregando</strong> el
                evento o lo rechazamos por firma. Comprueba en Paddle → Notifications:
              </p>
              <ul className="list-disc space-y-1 pl-5 font-editorial text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                <li>
                  Que el destination esté en el <strong>mismo environment</strong>{" "}
                  (<code>{env}</code>) que tu PADDLE_ENV. Un webhook creado en Live no
                  recibe pagos de Sandbox y viceversa — esta es la causa #1.
                </li>
                <li>
                  Que esté suscrito a <code>transaction.completed</code>.
                </li>
                <li>
                  Que el <strong>secret</strong> del destination sea exactamente el de
                  PADDLE_WEBHOOK_SECRET en Vercel.
                </li>
                <li>
                  Mira el <strong>delivery log</strong> del destination: si ves intentos
                  con respuesta 401 → secret mal. Si no ves intentos → environment o
                  suscripción mal.
                </li>
              </ul>
            </div>
          </article>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-success)]/40">
            <div className="bg-[color-mix(in_oklch,var(--color-success)_6%,var(--color-surface))] px-4 py-2">
              <p className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-success)]">
                <CheckCircle2 className="size-3.5" /> El webhook llega y la firma valida
              </p>
            </div>
            <ul className="divide-y divide-[var(--color-border)]">
              {recentWebhooks.map((w) => (
                <li key={w.id} className="space-y-1 bg-[var(--color-surface)] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs text-[var(--color-arena)]">
                      {w.message}
                    </span>
                    <span className="shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {formatDateTime(w.createdAt, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="font-editorial text-[0.72rem] italic leading-snug text-[var(--color-muted-foreground)]">
                    {w.notes}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
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
            name="NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"
            value={hasClientToken ? "set" : "missing"}
            ok={hasClientToken}
            hint="Para Paddle.js"
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

      {/* ─── Test real de creación de transaction ─── */}
      <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl tracking-tight">
              Test real · creación de transaction
            </h2>
            <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              Crea una transaction de prueba para el Pase Equipo (19 €) y verifica si Paddle
              devuelve el <code>checkout.url</code>. Detecta el gotcha más común: &quot;Default
              payment link&quot; sin configurar en el dashboard de Paddle.
            </p>
          </div>
          <Link
            href={runTest ? "/admin/paddle" : "/admin/paddle?test=1"}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
          >
            <PlayCircle className="size-3.5" />
            {runTest ? "Volver a ejecutar" : "Ejecutar test"}
          </Link>
        </header>
        <TxTestResultView result={txTest} />
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

function TxTestResultView({ result }: { result: TxTestResult }) {
  if (result.status === "not_run") {
    return (
      <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
        Pulsa &quot;Ejecutar test&quot; para hacer una llamada real a Paddle.
      </p>
    );
  }
  if (result.status === "skipped") {
    return (
      <p className="rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 px-4 py-3 font-editorial text-sm italic">
        Saltado: {result.reason}
      </p>
    );
  }
  if (result.status === "error") {
    return (
      <article className="space-y-2 rounded-md border border-[var(--color-danger)]/40 bg-[color-mix(in_oklch,var(--color-danger)_5%,var(--color-surface))] p-4">
        <p className="inline-flex items-center gap-2 font-display text-base tracking-tight text-[var(--color-danger)]">
          <XCircle className="size-4" /> La API devolvió un error
        </p>
        <pre className="overflow-x-auto rounded bg-[var(--color-bg)] p-2 font-mono text-xs">
          {result.error}
        </pre>
        <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          Causas habituales: priceId archivado / inactive, API key sin
          permisos suficientes, o validation del request.
        </p>
      </article>
    );
  }
  if (result.status === "no_checkout_url") {
    return (
      <article className="space-y-3 rounded-md border border-[var(--color-danger)]/40 bg-[color-mix(in_oklch,var(--color-danger)_5%,var(--color-surface))] p-4">
        <p className="inline-flex items-center gap-2 font-display text-base tracking-tight text-[var(--color-danger)]">
          <XCircle className="size-4" /> Transaction creada · falta checkout.url
        </p>
        <p className="font-editorial text-sm leading-relaxed">
          La API aceptó la transaction (<code>{result.txId}</code>) pero la respuesta no incluye un <code>checkout.url</code>. Esto suele ser falta del &quot;Default Payment Link&quot; en el dashboard de Paddle.
        </p>
        <div className="rounded border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-bg))] p-3">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
            Fix
          </p>
          <p className="mt-1 font-editorial text-sm leading-relaxed">
            Paddle dashboard → <strong>Checkout settings → Default payment link</strong> → <code>https://quinielamundial.es/checkout</code> → <strong>Save</strong>. Esa URL apunta a la página propia que carga Paddle.js y abre el overlay.
          </p>
        </div>
      </article>
    );
  }
  return (
    <article className="space-y-2 rounded-md border border-[var(--color-success)]/40 bg-[color-mix(in_oklch,var(--color-success)_5%,var(--color-surface))] p-4">
      <p className="inline-flex items-center gap-2 font-display text-base tracking-tight text-[var(--color-success)]">
        <CheckCircle2 className="size-4" /> Todo correcto · checkout.url emitido
      </p>
      <p className="font-mono text-xs text-[var(--color-muted-foreground)]">
        Transaction: {result.txId}
      </p>
      <a
        href={result.checkoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 break-all rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-xs text-[var(--color-arena)] hover:bg-[var(--color-surface-2)]"
      >
        {result.checkoutUrl}
      </a>
      <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
        Puedes abrir esta URL para verificar el hosted checkout funcionando.
      </p>
    </article>
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
