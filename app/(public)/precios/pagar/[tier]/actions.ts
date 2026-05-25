"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, pendingPayments } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { PAYMENT_METHODS, paymentConcept } from "@/lib/payment-methods";
import { TIER_LABEL, TIER_PRICE_EUR, type PaidTier } from "./tier-meta";

export type CreatePendingResult = {
  ok: boolean;
  error?: string;
  mailtoUrl?: string;
  concept?: string;
};

const schema = z.object({
  tier: z.enum(["team-50", "team-100", "team-250"]),
  method: z.enum(["bizum", "bank", "paypal", "unknown"]).default("unknown"),
  leagueJoinCode: z
    .string()
    .trim()
    .max(8)
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null)),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(180).optional(),
  notes: z.string().trim().max(1000).optional(),
});

/**
 * Persiste una intención de pago manual y construye la URL `mailto:` que
 * el cliente abrirá para que el usuario nos mande el comprobante.
 *
 * Si el usuario está logueado y la liga existe, vinculamos directamente.
 * Si no, el campo `email` que rellene en el form sirve como pista.
 */
export async function createPendingPayment(
  formData: FormData,
): Promise<CreatePendingResult> {
  const parsed = schema.safeParse({
    tier: formData.get("tier"),
    method: formData.get("method") ?? "unknown",
    leagueJoinCode: formData.get("leagueJoinCode") ?? undefined,
    name: formData.get("name") ?? undefined,
    email: formData.get("email") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const me = await getCurrentUser();

  let leagueId: number | null = null;
  if (parsed.data.leagueJoinCode) {
    const [league] = await db
      .select({ id: leagues.id, createdBy: leagues.createdBy })
      .from(leagues)
      .where(eq(leagues.joinCode, parsed.data.leagueJoinCode))
      .limit(1);
    if (league && (!me || league.createdBy === me.id)) {
      leagueId = league.id;
    }
  }

  const tier = parsed.data.tier as PaidTier;
  const concept = paymentConcept(tier, parsed.data.leagueJoinCode);
  const priceEur = TIER_PRICE_EUR[tier];

  const [row] = await db
    .insert(pendingPayments)
    .values({
      userId: me?.id ?? null,
      leagueId,
      tier,
      method: parsed.data.method,
      priceEur,
      concept,
      name: parsed.data.name ?? me?.nickname ?? null,
      email: parsed.data.email ?? me?.email ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning({ id: pendingPayments.id });

  revalidatePath("/admin/pagos");
  revalidatePath("/admin");

  return {
    ok: true,
    concept,
    mailtoUrl: buildMailto({
      tier,
      priceEur,
      concept,
      paymentId: row?.id ?? null,
      leagueCode: parsed.data.leagueJoinCode,
      method: parsed.data.method,
    }),
  };
}

function buildMailto(input: {
  tier: PaidTier;
  priceEur: number;
  concept: string;
  paymentId: number | null;
  leagueCode: string | null;
  method: string;
}): string {
  const subject = `Comprobante ${input.concept} · ${input.priceEur} €`;
  const lines = [
    "Hola,",
    "",
    `Acabo de hacer el pago del ${TIER_LABEL[input.tier]} (${input.priceEur} €).`,
    "",
    `Método: ${methodLabel(input.method)}`,
    `Concepto: ${input.concept}`,
    input.leagueCode
      ? `Liga (código): ${input.leagueCode}`
      : "Sin liga creada todavía — la indico abajo:",
    input.paymentId ? `Referencia interna: PP-${input.paymentId}` : "",
    "",
    "Adjunto el comprobante (capturas / PDF) en este email.",
    "",
    "Gracias.",
  ].filter(Boolean);
  const body = lines.join("\n");
  return `mailto:${PAYMENT_METHODS.receiptEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function methodLabel(method: string): string {
  switch (method) {
    case "bizum":
      return "Bizum";
    case "bank":
      return "Transferencia / IBAN";
    case "paypal":
      return "PayPal";
    default:
      return "Pendiente de elegir";
  }
}
