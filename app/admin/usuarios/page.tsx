import Link from "next/link";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { ArrowDown, ArrowUp, ArrowUpDown, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { leagues, profiles } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
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
import { formatDate, formatDateTime, initials, cn } from "@/lib/utils";
import { UserActions } from "./user-actions";
import { UsersFilters } from "./users-filters";

export const metadata = { title: "Usuarios · Admin" };
export const dynamic = "force-dynamic";

const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 200;

type SortKey = "participant" | "created" | "lastSeen";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requireAdmin();
  const sp = await searchParams;

  // ── Filtros + orden (server-side, vía query string) ──
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const role = sp.role === "user" || sp.role === "admin" ? sp.role : "all";
  const status =
    sp.status === "active" || sp.status === "suspended" ? sp.status : "all";
  const sort: SortKey =
    sp.sort === "participant" || sp.sort === "lastSeen" ? sp.sort : "created";
  const dir: "asc" | "desc" = sp.dir === "asc" ? "asc" : "desc";

  const conds: SQL[] = [];
  if (q) {
    conds.push(
      or(ilike(profiles.nickname, `%${q}%`), ilike(profiles.email, `%${q}%`))!,
    );
  }
  if (role !== "all") conds.push(eq(profiles.role, role));
  if (status === "active") conds.push(isNull(profiles.bannedAt));
  else if (status === "suspended") conds.push(isNotNull(profiles.bannedAt));
  const whereExpr = conds.length > 0 ? and(...conds) : undefined;

  // Orden. Por defecto, los más nuevos primero (createdAt desc).
  const dirSql = dir === "asc" ? sql`asc` : sql`desc`;
  const orderExpr =
    sort === "participant"
      ? sql`lower(coalesce(${profiles.nickname}, ${profiles.email})) ${dirSql}, ${profiles.id} asc`
      : sort === "lastSeen"
        ? sql`${profiles.lastSeenAt} ${dirSql} nulls last, ${profiles.id} asc`
        : sql`${profiles.createdAt} ${dirSql}, ${profiles.id} asc`;

  const rawPer = Number(sp.per);
  const perPage =
    Number.isFinite(rawPer) && rawPer > 0
      ? Math.min(MAX_PER_PAGE, Math.max(1, Math.floor(rawPer)))
      : DEFAULT_PER_PAGE;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(profiles)
    .where(whereExpr);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const rawPage = Number(sp.page);
  const currentPage =
    Number.isFinite(rawPage) && rawPage > 0
      ? Math.min(totalPages, Math.max(1, Math.floor(rawPage)))
      : 1;
  const offset = (currentPage - 1) * perPage;

  const users = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
      role: profiles.role,
      bannedAt: profiles.bannedAt,
      countryCode: profiles.countryCode,
      createdAt: profiles.createdAt,
      lastSeenAt: profiles.lastSeenAt,
      activeLeagueName: leagues.name,
      activeLeagueIsPublic: leagues.isPublic,
    })
    .from(profiles)
    .leftJoin(leagues, eq(leagues.id, profiles.leagueId))
    .where(whereExpr)
    .orderBy(orderExpr)
    .limit(perPage)
    .offset(offset);

  // Construye un href preservando la query string actual (menos `page`).
  const buildHref = (overrides: Record<string, string>): string => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "page" || v == null) continue;
      if (Array.isArray(v)) v.forEach((x) => params.append(k, x));
      else params.set(k, v);
    }
    for (const [k, v] of Object.entries(overrides)) params.set(k, v);
    const qs = params.toString();
    return qs ? `/admin/usuarios?${qs}` : "/admin/usuarios";
  };

  function SortHead({
    label,
    col,
    align = "left",
  }: {
    label: string;
    col: SortKey;
    align?: "left" | "right";
  }) {
    const activeCol = sort === col;
    const defaultDir = col === "participant" ? "asc" : "desc";
    const nextDir = activeCol ? (dir === "asc" ? "desc" : "asc") : defaultDir;
    const Icon = activeCol ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <TableHead>
        <Link
          href={buildHref({ sort: col, dir: nextDir })}
          scroll={false}
          className={cn(
            "group inline-flex items-center gap-1 transition hover:text-[var(--color-foreground)]",
            align === "right" && "w-full justify-end",
            activeCol && "text-[var(--color-arena)]",
          )}
        >
          {label}
          <Icon
            className={cn(
              "size-3",
              !activeCol && "opacity-30 transition-opacity group-hover:opacity-70",
            )}
          />
        </Link>
      </TableHead>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Usuarios"
        description={`Roles, baneos y suspensiones · ${total} usuario${total === 1 ? "" : "s"}${q || role !== "all" || status !== "all" ? " (filtrados)" : " registrados"}.`}
      />

      <UsersFilters q={q} role={role} status={status} />

      <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="Participante" col="participant" />
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Quiniela activa</TableHead>
              <TableHead>País</TableHead>
              <SortHead label="Registro" col="created" />
              <SortHead label="Última conexión" col="lastSeen" />
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
                    {u.activeLeagueName ? (
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <Trophy
                          className={cn(
                            "size-3.5 shrink-0",
                            u.activeLeagueIsPublic
                              ? "text-[var(--color-arena)]"
                              : "text-[var(--color-muted-foreground)]",
                          )}
                        />
                        <span className="max-w-[12rem] truncate">{u.activeLeagueName}</span>
                      </span>
                    ) : (
                      <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        Sin liga
                      </span>
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
                      isSelf={u.id === me.id}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-sm text-[var(--color-muted-foreground)]"
                >
                  {total === 0
                    ? "Ningún usuario coincide con los filtros."
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
