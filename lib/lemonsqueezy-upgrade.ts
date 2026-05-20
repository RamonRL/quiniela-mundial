import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, leagues, profiles } from "@/lib/db/schema";
import { TIER_MEMBER_LIMIT, type LeagueTier } from "@/lib/league-tiers";

/**
 * Auto-upgrade de una liga privada a partir de un pedido confirmado de
 * Lemon Squeezy. Lo invoca el webhook tras verificar la firma y el
 * status="paid". Es server-side puro (no es Server Action) para evitar
 * el overhead del runtime de Server Actions desde un endpoint REST.
 *
 * Estrategia de resolución de la liga, en orden:
 *   1. `leagueCode` (joinCode de 4 dígitos) si llegó en `custom_data`
 *      del checkout — la fuente más fiable.
 *   2. Email del comprador → busca al `createdBy` con ese email y
 *      lista sus ligas privadas. Solo auto-resuelve si **exactamente
 *      una** liga privada le pertenece. Si son cero o varias, el
 *      webhook cae al flujo manual y avisa al admin.
 *
 * Idempotente para el caller: si el upgrade ya se aplicó antes (mismo
 * tier, mismo memberLimit), no hace falta detectarlo aquí — el handler
 * descarta duplicados antes de llegar aquí via el order_id en notas.
 *
 * Salvaguarda anti-downgrade: si el `memberLimit` actual ya es mayor
 * que el del nuevo tier (la liga ya tenía un plan superior), devolvemos
 * "ineligible" sin tocar nada — el comprador habría comprado por
 * error un Pase inferior.
 */
export type LemonUpgradeInput = {
  leagueCode: string | null;
  customerEmail: string;
  tier: LeagueTier;
  paidAmountEur: number;
  orderRef: string;
};

export type LemonUpgradeResult =
  | { ok: true; leagueId: number; leagueName: string; resolvedBy: "league_code" | "email" }
  | { ok: false; reason: "no_match" | "ambiguous" | "ineligible" };

export async function autoUpgradeLeagueFromLemonOrder(
  args: LemonUpgradeInput,
): Promise<LemonUpgradeResult> {
  let target: typeof leagues.$inferSelect | null = null;
  let resolvedBy: "league_code" | "email" = "league_code";

  // 1. joinCode (de custom_data)
  if (args.leagueCode) {
    const code = args.leagueCode.trim();
    if (code) {
      const [row] = await db
        .select()
        .from(leagues)
        .where(and(eq(leagues.joinCode, code), eq(leagues.isPublic, false)))
        .limit(1);
      if (row) target = row;
    }
  }

  // 2. Fallback: email del owner. Solo si hay un único match.
  if (!target) {
    const [profile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.email, args.customerEmail))
      .limit(1);
    if (profile) {
      const owned = await db
        .select()
        .from(leagues)
        .where(
          and(
            eq(leagues.createdBy, profile.id),
            eq(leagues.isPublic, false),
          ),
        )
        .limit(2);
      if (owned.length === 1) {
        target = owned[0];
        resolvedBy = "email";
      } else if (owned.length > 1) {
        return { ok: false, reason: "ambiguous" };
      }
    }
  }

  if (!target) return { ok: false, reason: "no_match" };
  if (target.isPublic) return { ok: false, reason: "ineligible" };

  const newLimit = TIER_MEMBER_LIMIT[args.tier];

  // Anti-downgrade: si la liga ya tenía un tope mayor o ilimitado
  // (memberLimit=null), no bajamos.
  if (target.memberLimit == null) {
    return { ok: false, reason: "ineligible" };
  }
  if (newLimit != null && target.memberLimit > newLimit) {
    return { ok: false, reason: "ineligible" };
  }

  await db
    .update(leagues)
    .set({
      tier: args.tier,
      memberLimit: newLimit,
      paidAt: new Date(),
      paidAmountEur: args.paidAmountEur,
      paidVia: "lemonsqueezy",
    })
    .where(eq(leagues.id, target.id));

  await db.insert(auditLog).values({
    adminId: null,
    action: "league.upgrade.auto",
    payloadJson: {
      leagueId: target.id,
      tier: args.tier,
      memberLimit: newLimit,
      paidAmountEur: args.paidAmountEur,
      paidVia: "lemonsqueezy",
      orderRef: args.orderRef,
      resolvedBy,
      customerEmail: args.customerEmail,
    },
  });

  return {
    ok: true,
    leagueId: target.id,
    leagueName: target.name,
    resolvedBy,
  };
}
