import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, profiles } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/guards";
import { formatDateTime, initials } from "@/lib/utils";
import { AuditFilters } from "./filters";

export const metadata = { title: "Auditoría · Monitoreo" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = {
  admin?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function MonitoringAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Construimos los filtros respetando el shape de SQL de drizzle.
  const filters: SQL[] = [];
  if (sp.admin) filters.push(eq(auditLog.adminId, sp.admin));
  if (sp.action) filters.push(eq(auditLog.action, sp.action));
  if (sp.from) filters.push(gte(auditLog.createdAt, new Date(sp.from)));
  if (sp.to) {
    // El input `date` da YYYY-MM-DD, lo extendemos a 23:59 del mismo día.
    const end = new Date(sp.to);
    end.setHours(23, 59, 59, 999);
    filters.push(lte(auditLog.createdAt, end));
  }
  const whereExpr = filters.length > 0 ? and(...filters) : undefined;

  const [logsBase, totalRow, adminOptions, actionOptions] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(whereExpr)
      .orderBy(desc(auditLog.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(whereExpr),
    db
      .select({ id: profiles.id, email: profiles.email, nickname: profiles.nickname })
      .from(profiles)
      .where(eq(profiles.role, "admin"))
      .orderBy(asc(profiles.email)),
    db
      .select({
        value: auditLog.action,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLog)
      .groupBy(auditLog.action)
      .orderBy(desc(sql`count(*)`)),
  ]);

  const total = (totalRow[0]?.count as number | undefined) ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const adminIds = Array.from(
    new Set(logsBase.map((l) => l.adminId).filter((x): x is string => !!x)),
  );
  const admins =
    adminIds.length > 0
      ? await db.select().from(profiles).where(inArray(profiles.id, adminIds))
      : [];
  const adminById = new Map(admins.map((a) => [a.id, a]));

  const adminOptionList = adminOptions.map((a) => ({
    id: a.id,
    label: a.nickname || a.email.split("@")[0],
  }));
  const actionOptionList = actionOptions.map((a) => ({
    value: a.value,
    count: Number(a.count),
  }));

  // Construimos las URLs de paginación preservando filtros actuales.
  const buildPageHref = (n: number) => {
    const next = new URLSearchParams();
    if (sp.admin) next.set("admin", sp.admin);
    if (sp.action) next.set("action", sp.action);
    if (sp.from) next.set("from", sp.from);
    if (sp.to) next.set("to", sp.to);
    if (n > 1) next.set("page", String(n));
    const qs = next.toString();
    return `/admin/monitoreo/auditoria${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <AuditFilters admins={adminOptionList} actions={actionOptionList} />

      <div className="flex items-center justify-between">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {total} {total === 1 ? "registro" : "registros"} · página {page} de {totalPages}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Cuándo</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Payload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsBase.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-sm text-[var(--color-muted-foreground)]"
                >
                  No hay registros que coincidan con los filtros.
                </TableCell>
              </TableRow>
            ) : null}
            {logsBase.map((l) => {
              const admin = l.adminId ? adminById.get(l.adminId) : null;
              const display = admin?.nickname ?? admin?.email?.split("@")[0] ?? "—";
              return (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-[var(--color-muted-foreground)]">
                    {formatDateTime(l.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        {admin?.avatarUrl ? <AvatarImage src={admin.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="text-[0.55rem]">
                          {initials(display)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{display}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[0.6rem]">
                      {l.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    {l.payloadJson ? (
                      <details className="group">
                        <summary className="cursor-pointer text-xs text-[var(--color-arena)] hover:underline">
                          ver
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-md bg-[var(--color-surface-2)] p-2 text-[0.65rem] text-[var(--color-muted-foreground)]">
                          {JSON.stringify(l.payloadJson, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-[var(--color-muted-foreground)]">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Pager href={buildPageHref(page - 1)} disabled={page <= 1} label="← Anterior" />
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {page} / {totalPages}
          </span>
          <Pager href={buildPageHref(page + 1)} disabled={page >= totalPages} label="Siguiente →" />
        </div>
      ) : null}
    </div>
  );
}

function Pager({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] opacity-50">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--color-arena)]/40"
    >
      {label}
    </Link>
  );
}
