import { asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TeamFlag } from "@/components/brand/team-flag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shell/page-header";
import { Pagination } from "@/components/admin/pagination";
import { formatDate, formatDateTime, initials } from "@/lib/utils";
import { UserActions } from "./user-actions";

export const metadata = { title: "Usuarios · Admin" };
export const dynamic = "force-dynamic";

const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 200;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawPage = Number(sp.page);
  const rawPer = Number(sp.per);
  const perPage =
    Number.isFinite(rawPer) && rawPer > 0
      ? Math.min(MAX_PER_PAGE, Math.max(1, Math.floor(rawPer)))
      : DEFAULT_PER_PAGE;

  // Total para calcular cuántas páginas hay. Drizzle no expone count() de
  // forma nativa, así que usamos sql template.
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(profiles);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage =
    Number.isFinite(rawPage) && rawPage > 0
      ? Math.min(totalPages, Math.max(1, Math.floor(rawPage)))
      : 1;
  const offset = (currentPage - 1) * perPage;

  const users = await db
    .select()
    .from(profiles)
    .orderBy(asc(profiles.createdAt))
    .limit(perPage)
    .offset(offset);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Usuarios"
        description={`Roles, baneos y suspensiones · ${total} usuario${total === 1 ? "" : "s"} registrado${total === 1 ? "" : "s"}.`}
      />
      <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participante</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>País</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Última conexión</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const display = u.nickname || u.email.split("@")[0];
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8">
                        {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
                        <AvatarFallback>{initials(display)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{display}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--color-muted-foreground)]">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "danger" : "outline"}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.bannedAt ? (
                      <Badge variant="danger">Suspendido</Badge>
                    ) : (
                      <Badge variant="success">Activo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.countryCode ? (
                      <span className="inline-flex items-center gap-1.5">
                        <TeamFlag code={u.countryCode} size={18} />
                        <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                          {u.countryCode}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--color-muted-foreground)]">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--color-muted-foreground)]">
                    {u.lastSeenAt ? (
                      formatDateTime(u.lastSeenAt, {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    ) : (
                      <span>—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActions
                      userId={u.id}
                      role={u.role}
                      banned={u.bannedAt != null}
                      displayName={display}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-sm text-[var(--color-muted-foreground)]"
                >
                  {total === 0
                    ? "Aún no hay usuarios registrados."
                    : "No hay usuarios en esta página."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          perPage={perPage}
          baseHref="/admin/usuarios"
          searchParams={sp}
        />
      </div>
    </div>
  );
}
