"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  upgradeLeague,
  type LeagueFormState,
} from "@/lib/league-actions";
import { TIER_MEMBER_LIMIT, type LeagueTier } from "@/lib/league-tiers";

const initialState: LeagueFormState = { ok: false };

const TIERS: { id: LeagueTier; label: string; priceEur: number | null }[] = [
  { id: "free", label: "Free · 20 miembros", priceEur: 0 },
  { id: "team-50", label: "Pase Equipo · 50 miembros", priceEur: 19 },
  { id: "team-100", label: "Pase Empresa · 100 miembros", priceEur: 49 },
  { id: "team-250", label: "Pase Empresa Plus · 250 miembros", priceEur: 99 },
  { id: "enterprise", label: "Enterprise · a medida", priceEur: null },
];

type Props = {
  league: {
    id: number;
    tier: LeagueTier;
    memberLimit: number | null;
    paidAt: Date | null;
    paidAmountEur: number | null;
    paidVia: string | null;
  };
};

/**
 * Form para que admin ajuste el tier, el `memberLimit` y los datos de
 * pago de una liga (típicamente tras cobrar un Pase Mundial 2026 por
 * PayPal). Al cambiar el tier, autocompleta el `memberLimit` y el
 * importe sugerido — el admin puede sobreescribirlos antes de guardar.
 */
export function LeaguePlanForm({ league }: Props) {
  const [state, action, pending] = useActionState(upgradeLeague, initialState);
  const [tier, setTier] = useState<LeagueTier>(league.tier);
  const [memberLimit, setMemberLimit] = useState<string>(
    league.memberLimit != null ? String(league.memberLimit) : "",
  );
  const [paidAmount, setPaidAmount] = useState<string>(
    league.paidAmountEur != null ? String(league.paidAmountEur) : "",
  );
  const [paidVia, setPaidVia] = useState<string>(league.paidVia ?? "paypal");

  function handleTierChange(next: LeagueTier) {
    setTier(next);
    const defaultLimit = TIER_MEMBER_LIMIT[next];
    if (defaultLimit != null) setMemberLimit(String(defaultLimit));
    const planMeta = TIERS.find((t) => t.id === next);
    if (planMeta?.priceEur != null) setPaidAmount(String(planMeta.priceEur));
  }

  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] p-5"
    >
      <input type="hidden" name="id" value={league.id} />
      <header className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg tracking-tight">Plan y límite</h3>
        {league.paidAt ? (
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            Último pago · {league.paidAt.toLocaleDateString("es-ES")}
          </span>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="block font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Tier
          </span>
          <select
            name="tier"
            value={tier}
            onChange={(e) => handleTierChange(e.target.value as LeagueTier)}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-arena)]"
          >
            {TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="block font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Member limit (vacío = sin tope)
          </span>
          <input
            type="number"
            name="memberLimit"
            min={1}
            max={10000}
            value={memberLimit}
            onChange={(e) => setMemberLimit(e.target.value)}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-arena)]"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="block font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Importe pagado (€)
          </span>
          <input
            type="number"
            name="paidAmountEur"
            min={0}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-arena)]"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="block font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Vía de pago
          </span>
          <input
            type="text"
            name="paidVia"
            value={paidVia}
            onChange={(e) => setPaidVia(e.target.value)}
            placeholder="paypal"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-arena)]"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="markPaidNow"
          className="size-4 accent-[var(--color-arena)]"
          defaultChecked={tier !== "free" && !league.paidAt}
        />
        <span>Marcar pagado ahora (setea paidAt = now)</span>
      </label>

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      {state.ok && state.message ? (
        <p className="text-sm text-[var(--color-success)]">{state.message}</p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar plan"}
        </Button>
      </div>
    </form>
  );
}
