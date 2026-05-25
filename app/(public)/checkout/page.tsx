import { PageHeader } from "@/components/shell/page-header";
import { paddleClientToken, paddlePublicEnv } from "@/lib/paddle";
import { CheckoutOverlay } from "./checkout-overlay";

export const metadata = {
  title: "Procesando pago",
  robots: { index: false, follow: false },
};

/**
 * Página que recibe el redirect de Paddle tras crear una transaction
 * vía API. Paddle Billing no aloja el checkout en su dominio: en su
 * lugar, anexa `?_ptxn=<txn_id>` a tu "Default Payment Link" y delega
 * el render del overlay a Paddle.js corriendo en TU sitio.
 *
 * En el dashboard de Paddle hay que configurar:
 *   - Checkout settings → Default Payment Link → https://quinielamundial.es/checkout
 *   - Checkout settings → Approved Domains → quinielamundial.es (+ *.vercel.app si pruebas previews)
 *
 * El SDK del cliente (`@paddle/paddle-js`) se inicializa con
 * NEXT_PUBLIC_PADDLE_CLIENT_TOKEN y `Paddle.Checkout.open({ transactionId })`
 * abre el modal sobre esta misma página.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ _ptxn?: string }>;
}) {
  const sp = await searchParams;
  const transactionId = sp._ptxn ?? null;
  const token = paddleClientToken();
  const env = paddlePublicEnv();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pago seguro"
        title="Procesando tu pedido"
        description="Estamos abriendo la ventana de pago de Paddle. Si no aparece automáticamente, pulsa el botón de abajo."
      />

      <CheckoutOverlay
        transactionId={transactionId}
        token={token}
        environment={env}
      />
    </div>
  );
}
