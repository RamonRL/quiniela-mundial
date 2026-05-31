import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, leagues, profiles } from "@/lib/db/schema";
import { TIER_MEMBER_LIMIT, type LeagueTier } from "@/lib/league-tiers";
import { createLeagueRecord } from "@/lib/leagues";
import type { PaidTierId } from "@/lib/paddle";
import type { PredictionMode } from "@/lib/prediction-modes";

/**
 * Auto-upgrade de una liga privada a partir de una transaction
 * confirmada de Paddle. Lo invoca el webhook `transaction.completed`
 * tras verificar la firma.
 *
 * Estrategia de resolución de la liga, en orden:
 *   1. `leagueCode` (joinCode de 4 dígitos) si llegó en `customData`
 *      del transaction — la fuente más fiable.
 *   2. Email del comprador → busca al `createdBy` con ese email y
 *      lista sus ligas privadas. Solo auto-resuelve si **exactamente
 *      una** liga privada le pertenece. Si son cero o varias, el
 *      webhook cae al flujo manual y avisa al admin.
 *
 * Anti-downgrade: si el `memberLimit` actual ya es mayor que el del
 * nuevo tier, devolvemos "ineligible" sin tocar nada.
 */
export type PaddleUpgradeInput = {
  leagueCode: string | null;
  customerEmail: string;
  tier: LeagueTier;
  paidAmountEur: number;
  transactionId: string;
};

export type PaddleUpgradeResult =
  | {
      ok: true;
      leagueId: number;
      leagueName: string;
      resolvedBy: "league_code" | "email";
    }
  | { ok: false; reason: "no_match" | "ambiguous" | "ineligible" };

export async function autoUpgradeLeagueFromPaddleTransaction(
  args: PaddleUpgradeInput,
): Promise<PaddleUpgradeResult> {
  let target: typeof leagues.$inferSelect | null = null;
  let resolvedBy: "league_code" | "email" = "league_code";

  // 1. joinCode (de customData)
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
          and(eq(leagues.createdBy, profile.id), eq(leagues.isPublic, false)),
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
      paidVia: "paddle",
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
      paidVia: "paddle",
      transactionId: args.transactionId,
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

export type CreatePaidLeagueResult = {
  leagueId: number;
  leagueName: string;
  joinCode: string | null;
  inviteToken: string;
  /** false si ya existía (idempotencia): el caller no debe re-notificar. */
  created: boolean;
};

/**
 * Crea una liga privada YA pagada a partir de una transaction completada de
 * Paddle (flujo "pagar antes de crear"). Idempotente vía `leagues.paidTxId`:
 * si el webhook y el `finalizePaidLeague` del cliente coinciden, solo se crea
 * una vez. Lo invocan ambos.
 */
export async function createPaidLeagueFromTransaction(opts: {
  txId: string;
  userId: string;
  tier: PaidTierId;
  name: string;
  mode: PredictionMode;
  logoUrl: string;
  paidAmountEur: number;
}): Promise<CreatePaidLeagueResult> {
  const existing = await findLeagueByTxId(opts.txId);
  if (existing) return { ...existing, created: false };

  const memberLimit = TIER_MEMBER_LIMIT[opts.tier];
  let rec;
  try {
    rec = await createLeagueRecord({
      userId: opts.userId,
      name: opts.name,
      mode: opts.mode,
      logoUrl: opts.logoUrl,
      tier: opts.tier,
      memberLimit,
      paid: { txId: opts.txId, amountEur: opts.paidAmountEur },
    });
  } catch (err) {
    // Carrera: el otro camino insertó con el mismo paidTxId (UNIQUE) entre
    // el SELECT de arriba y este INSERT. Reconsultamos y devolvemos esa liga.
    const raced = await findLeagueByTxId(opts.txId);
    if (raced) return { ...raced, created: false };
    throw err;
  }

  await db.insert(auditLog).values({
    adminId: null,
    action: "league.create.paid",
    payloadJson: {
      leagueId: rec.id,
      tier: opts.tier,
      memberLimit,
      paidAmountEur: opts.paidAmountEur,
      paidVia: "paddle",
      transactionId: opts.txId,
      userId: opts.userId,
    },
  });

  return {
    leagueId: rec.id,
    leagueName: rec.name,
    joinCode: rec.joinCode,
    inviteToken: rec.inviteToken,
    created: true,
  };
}

async function findLeagueByTxId(txId: string): Promise<{
  leagueId: number;
  leagueName: string;
  joinCode: string | null;
  inviteToken: string;
} | null> {
  const [row] = await db
    .select({
      leagueId: leagues.id,
      leagueName: leagues.name,
      joinCode: leagues.joinCode,
      inviteToken: leagues.inviteToken,
    })
    .from(leagues)
    .where(eq(leagues.paidTxId, txId))
    .limit(1);
  return row ?? null;
}
