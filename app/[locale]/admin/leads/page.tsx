import { desc } from "drizzle-orm";
import { Mail } from "lucide-react";
import { db } from "@/lib/db";
import { commercialLeads } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { LeadRow } from "./lead-row";

export const metadata = { title: "Leads comerciales · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  await requireAdmin();

  const leads = await db
    .select()
    .from(commercialLeads)
    .orderBy(desc(commercialLeads.createdAt));

  const byStatus = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial"
        title="Leads"
        description="Personas que han contactado desde /precios o /contacto pidiendo presupuesto. Marca el estado a medida que cierras."
      />

      <section className="grid gap-3 sm:grid-cols-4">
        <Tile label="Nuevos" value={byStatus.new ?? 0} accent />
        <Tile label="Contactados" value={byStatus.contacted ?? 0} />
        <Tile label="Ganados" value={byStatus.won ?? 0} />
        <Tile label="Perdidos" value={byStatus.lost ?? 0} />
      </section>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {leads.length === 0 ? (
          <EmptyState
            icon={<Mail className="size-5" />}
            title="Sin leads todavía"
            description="Cuando alguien envíe el formulario de /precios o /contacto, aparecerá aquí y te llegará alerta a Telegram."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead className="hidden md:table-cell">Miembros</TableHead>
                <TableHead className="hidden sm:table-cell">Recibido</TableHead>
                <TableHead className="w-44">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="truncate text-sm font-medium">{l.name}</p>
                      <a
                        href={`mailto:${l.email}`}
                        className="block truncate font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-arena)] hover:underline"
                      >
                        {l.email}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">
                    {l.company ?? <span className="text-[var(--color-muted-foreground)]">—</span>}
                  </TableCell>
                  <TableCell className="hidden font-display tabular md:table-cell">
                    {l.expectedMembers ?? <span className="text-[var(--color-muted-foreground)]">—</span>}
                  </TableCell>
                  <TableCell className="hidden text-xs text-[var(--color-muted-foreground)] sm:table-cell">
                    {formatDateTime(l.createdAt, {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <LeadRow
                      lead={{
                        id: l.id,
                        status: l.status,
                        notes: l.notes,
                        message: l.message,
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
  accent,
}: {
  label: string;
  value: number;
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
      </p>
    </div>
  );
}
