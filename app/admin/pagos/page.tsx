import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CreditCard, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { leagues, pendingPayments } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { PaymentRow } from "./payment-row";

export const metadata = { title: "Pagos pendientes · Admin" };
export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  bizum: "Bizum",
  bank: "Transf.",
  paypal: "PayPal",
  unknown: "—",
};

const TIER_LABEL: Record<string, string> = {
  "team-50": "Equipo",
  "team-100": "Empresa",
  "team-250": "Empresa+",
  free: "Free",
  enterprise: "Enterprise",
};

export default async function AdminPagosPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: pendingPayments.id,
      leagueId: pendingPayments.leagueId,
      tier: pendingPayments.tier,
      method: pendingPayments.method,
      priceEur: pendingPayments.priceEur,
      concept: pendingPayments.concept,
      email: pendingPayments.email,
      name: pendingPayments.name,
      status: pendingPayments.status,
      notes: pendingPayments.notes,
      createdAt: pendingPayments.createdAt,
      leagueName: leagues.name,
      leagueJoinCode: leagues.joinCode,
    })
    .from(pendingPayments)
    .leftJoin(leagues, eq(leagues.id, pendingPayments.leagueId))
    .orderBy(desc(pendingPayments.createdAt));

  const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalPending = rows
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.priceEur, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial"
        title="Pagos pendientes"
        description="Intenciones de pago manual (Bizum / IBAN / PayPal). Cruza con el extracto bancario y marca verified cuando confirmes el ingreso. Luego sube el tier de la liga en /admin/ligas/[id]."
      />

      <section className="grid gap-3 sm:grid-cols-4">
        <Tile label="Pendientes" value={byStatus.pending ?? 0} accent />
        <Tile label="Verificados" value={byStatus.verified ?? 0} />
        <Tile label="Rechazados" value={byStatus.rejected ?? 0} />
        <Tile label="€ pendientes" value={totalPending} suffix="€" />
      </section>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {rows.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="size-5" />}
            title="Sin pagos registrados"
            description="Cuando alguien clique 'He pagado' en /precios/pagar/[tier] aparecerá aquí."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comprador</TableHead>
                <TableHead className="hidden md:table-cell">Liga</TableHead>
                <TableHead>Tier · €</TableHead>
                <TableHead className="hidden sm:table-cell">Concepto / método</TableHead>
                <TableHead className="hidden lg:table-cell">Recibido</TableHead>
                <TableHead className="w-44">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="truncate text-sm font-medium">{r.name ?? "—"}</p>
                      {r.email ? (
                        <a
                          href={`mailto:${r.email}`}
                          className="block truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-arena)] hover:underline"
                        >
                          {r.email}
                        </a>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {r.leagueId ? (
                      <Link
                        href={`/admin/ligas/${r.leagueId}`}
                        className="group inline-flex items-center gap-1 text-sm"
                      >
                        <span className="truncate">{r.leagueName ?? `Liga ${r.leagueId}`}</span>
                        <ExternalLink className="size-3 shrink-0 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-arena)]" />
                      </Link>
                    ) : (
                      <span className="text-xs italic text-[var(--color-muted-foreground)]">
                        Sin liga
                      </span>
                    )}
                    {r.leagueJoinCode ? (
                      <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        {r.leagueJoinCode}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-display tabular text-lg text-[var(--color-arena)] glow-arena">
                        {r.priceEur} €
                      </p>
                      <Badge variant="outline" className="text-[0.55rem]">
                        {TIER_LABEL[r.tier] ?? r.tier}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[var(--color-arena)]">
                      {r.concept}
                    </p>
                    <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      vía {METHOD_LABEL[r.method] ?? r.method}
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-xs text-[var(--color-muted-foreground)] lg:table-cell">
                    {formatDateTime(r.createdAt, {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <PaymentRow
                      payment={{
                        id: r.id,
                        status: r.status,
                        notes: r.notes,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        accent
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p
        className={`mt-2 font-display tabular text-4xl tracking-tight ${
          accent ? "text-[var(--color-arena)] glow-arena" : ""
        }`}
      >
        {value}
        {suffix ? <span className="ml-1 text-xl">{suffix}</span> : null}
      </p>
    </div>
  );
}
