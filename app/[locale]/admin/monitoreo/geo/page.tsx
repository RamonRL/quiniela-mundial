import { sql } from "drizzle-orm";
import { Globe2 } from "lucide-react";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamFlag } from "@/components/brand/team-flag";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata = { title: "Geo · Monitoreo" };
export const dynamic = "force-dynamic";

type Row = { countryCode: string | null; userCount: number };

// Resolución de nombres ISO-2 → "España", "México"…. Cached entre llamadas
// del mismo render: `Intl.DisplayNames` es seguro en Server Components.
const COUNTRY_NAME = new Intl.DisplayNames(["es"], { type: "region" });

function nameFor(code: string | null): string {
  if (!code) return "Desconocido";
  try {
    return COUNTRY_NAME.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export default async function MonitoringGeoPage() {
  await requireAdmin();

  const rows = await db
    .select({
      countryCode: profiles.countryCode,
      userCount: sql<number>`count(*)::int`,
    })
    .from(profiles)
    .groupBy(profiles.countryCode);

  // Ordenamos: filas con país, descendente por count; los nulls al final.
  const sorted = [...rows].sort((a, b) => {
    if (a.countryCode == null && b.countryCode != null) return 1;
    if (b.countryCode == null && a.countryCode != null) return -1;
    return b.userCount - a.userCount;
  }) as Row[];

  const total = sorted.reduce((s, r) => s + r.userCount, 0);
  const known = sorted.filter((r) => r.countryCode != null);
  const unknown = sorted.find((r) => r.countryCode == null);
  const maxCount = known[0]?.userCount ?? 1;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<Globe2 className="size-4" />}
          label="Países representados"
          value={known.length.toString()}
        />
        <Stat label="Usuarios identificados" value={(total - (unknown?.userCount ?? 0)).toString()} />
        <Stat
          label="Sin país"
          value={(unknown?.userCount ?? 0).toString()}
          hint="conectaron antes de la migración geo"
          muted
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>País</TableHead>
              <TableHead className="w-32">Usuarios</TableHead>
              <TableHead>%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-sm text-[var(--color-muted-foreground)]"
                >
                  Aún no hay usuarios.
                </TableCell>
              </TableRow>
            ) : null}
            {sorted.map((r, i) => {
              const isUnknown = r.countryCode == null;
              const pct = total > 0 ? (r.userCount / total) * 100 : 0;
              const barPct = isUnknown ? 0 : Math.max(2, (r.userCount / maxCount) * 100);
              return (
                <TableRow key={r.countryCode ?? "unknown"}>
                  <TableCell className="font-mono text-xs text-[var(--color-muted-foreground)]">
                    {isUnknown ? "—" : (i + 1).toString().padStart(2, "0")}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <TeamFlag code={r.countryCode ?? undefined} size={20} />
                      <span className="font-medium">{nameFor(r.countryCode)}</span>
                      {r.countryCode ? (
                        <Badge variant="outline" className="text-[0.55rem]">
                          {r.countryCode}
                        </Badge>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-display tabular text-lg">{r.userCount}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-12 shrink-0 font-mono text-xs text-[var(--color-muted-foreground)]">
                        {pct.toFixed(1)}%
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-arena)]"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  muted,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
        {icon}
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.32em]">{label}</span>
      </div>
      <p
        className={`mt-2 font-display tabular text-4xl tracking-tight ${
          muted ? "text-[var(--color-muted-foreground)]" : ""
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
