import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, Users } from "lucide-react";
import { asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, pointsLedger, profiles } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { requireAdmin } from "@/lib/auth/guards";
import { inLeagueFilter } from "@/lib/leagues";
import { formatDateTime, initials } from "@/lib/utils";
import { InviteLinkCopy } from "../invite-link-copy";
import { MemberActions } from "./member-actions";
import { LeaguePlanForm } from "./league-plan-form";
import type { LeagueTier } from "@/lib/leagues";

export const metadata = { title: "Gestión de liga · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const leagueId = Number(id);
  if (!Number.isFinite(leagueId)) notFound();

  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!league) notFound();

  // Miembros: el filtro incluye admins (que pertenecen a todas las ligas).
  const memberFilter = inLeagueFilter(leagueId)!;
  const [members, otherLeagues, pointsRows] = await Promise.all([
    db
      .select()
      .from(profiles)
      .where(memberFilter)
      .orderBy(asc(profiles.createdAt)),
    db
      .select({ id: leagues.id, name: leagues.name, isPublic: leagues.isPublic })
      .from(leagues)
      .where(ne(leagues.id, leagueId))
      .orderBy(asc(leagues.isPublic), asc(leagues.name)),
    db
      .select({
        userId: pointsLedger.userId,
        total: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int`,
      })
      .from(pointsLedger)
      .where(eq(pointsLedger.leagueId, leagueId))
      .groupBy(pointsLedger.userId),
  ]);

  const pointsByUser = new Map(pointsRows.map((r) => [r.userId, r.total]));

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
        <Link href="/admin/ligas">
          <ArrowLeft />
          Volver a ligas
        </Link>
      </Button>

      <PageHeader
        eyebrow={league.isPublic ? "Liga pública" : "Liga privada"}
        title={league.name}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Miembros"
          value={
            league.memberLimit != null
              ? `${members.length} / ${league.memberLimit}`
              : String(members.length)
          }
          accent
          textValue
        />
        <StatTile
          label="Plan"
          value={(league.tier ?? "free").toString()}
          textValue
        />
        {league.joinCode ? (
          <StatTile label="Código" value={league.joinCode} textValue />
        ) : null}
        <StatTile
          label="Creada"
          value={formatDateTime(league.createdAt, { day: "2-digit", month: "short", year: "numeric" })}
          textValue
        />
      </section>

      {!league.isPublic ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <header className="flex items-center gap-2 pb-3 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Invite link
          </header>
          <InviteLinkCopy token={league.inviteToken} />
        </div>
      ) : null}

      {!league.isPublic ? (
        <LeaguePlanForm
          league={{
            id: league.id,
            tier: league.tier as LeagueTier,
            memberLimit: league.memberLimit,
            paidAt: league.paidAt,
            paidAmountEur: league.paidAmountEur,
            paidVia: league.paidVia,
          }}
        />
      ) : null}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {members.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="Sin miembros"
            description={
              league.isPublic
                ? "Cuando alguien se registre por el enlace público de la app, aparecerá aquí."
                : "Comparte el invite link de arriba para que los participantes se unan."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participante</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Alta</TableHead>
                <TableHead className="text-right">Pts</TableHead>
                <TableHead className="w-44 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const display = m.nickname || m.email.split("@")[0];
                const points = pointsByUser.get(m.id) ?? 0;
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 border border-[var(--color-border)]">
                          {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt="" /> : null}
                          <AvatarFallback className="text-[0.65rem]">
                            {initials(display)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {display}
                            {m.role === "admin" ? (
                              <ShieldCheck className="ml-1.5 inline size-3 text-[var(--color-arena)]" />
                            ) : null}
                          </p>
                          <p className="truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] lg:hidden">
                            {m.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-xs text-[var(--color-muted-foreground)] lg:table-cell">
                      {m.email}
                    </TableCell>
                    <TableCell className="hidden text-xs text-[var(--color-muted-foreground)] sm:table-cell">
                      {formatDateTime(m.createdAt, { day: "2-digit", month: "short" })}
                    </TableCell>
                    <TableCell className="text-right font-display tabular text-base">
                      {points}
                    </TableCell>
                    <TableCell className="text-right">
                      <MemberActions
                        userId={m.id}
                        userLabel={display}
                        userEmail={m.email}
                        isAdmin={m.role === "admin"}
                        currentLeagueId={leagueId}
                        currentLeagueIsPublic={league.isPublic}
                        otherLeagues={otherLeagues}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
        <strong className="font-semibold not-italic">Eliminar</strong> borra el perfil del
        usuario, todas sus predicciones, puntos y mensajes, e invalida su sesión Supabase. El
        siguiente login le crea un perfil vacío. Si sólo quieres cambiarlo de liga, usa{" "}
        <strong className="font-semibold not-italic">Mover</strong>.
      </p>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  textValue,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  textValue?: boolean;
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
        className={`mt-2 font-display tabular tracking-tight ${
          textValue ? "text-lg" : "text-4xl"
        } ${accent ? "text-[var(--color-arena)] glow-arena" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
