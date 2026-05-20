import { redirect } from "next/navigation";
import { Crown, ShieldCheck, Users } from "lucide-react";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, pointsLedger, profiles } from "@/lib/db/schema";
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
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { DeleteButton } from "@/components/admin/delete-button";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, inLeagueFilter } from "@/lib/leagues";
import { deleteOwnLeague } from "@/lib/league-actions";
import { formatDateTime, initials } from "@/lib/utils";
import { InviteLinkCopy } from "@/app/admin/ligas/invite-link-copy";
import { CodeDisplay } from "./code-display";
import { EditLeagueForm } from "./edit-league-form";
import { KickButton, LeaveButton } from "./member-actions";

export const metadata = { title: "Mi Quiniela" };
export const dynamic = "force-dynamic";

export default async function MyLeaguePage() {
  const me = await requireUser();
  const leagueId = await currentLeagueId(me);
  if (leagueId == null) redirect("/onboarding");

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  // Si la activa es la pública o no existe, esta página no aplica → al
  // dashboard. Aquí solo se gestionan quinielas privadas.
  if (!league || league.isPublic) redirect("/dashboard");

  const memberFilter = inLeagueFilter(leagueId)!;
  const [members, pointsRows] = await Promise.all([
    db
      .select()
      .from(profiles)
      .where(memberFilter)
      .orderBy(asc(profiles.createdAt)),
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
  const isOwner = league.createdBy === me.id;

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-5">
        {league.logoUrl ? (
          <Avatar className="size-20 shrink-0 border-2 border-[var(--color-border-strong)] shadow-[var(--shadow-elev-1)] sm:size-24">
            <AvatarImage src={league.logoUrl} alt={league.name} />
            <AvatarFallback className="font-display text-2xl tracking-tight">
              {initials(league.name)}
            </AvatarFallback>
          </Avatar>
        ) : null}
        <div className="min-w-0 flex-1">
          <PageHeader
            eyebrow="Quiniela privada"
            title={league.name}
            description={
              isOwner
                ? "Tu quiniela. Comparte el código o el enlace para que se unan, gestiona miembros y, si quieres, elimínala."
                : "Aquí ves a quienes están dentro y cómo invitar a más gente."
            }
            actions={
              isOwner ? (
                <DeleteButton
                  action={deleteOwnLeague}
                  id={league.id}
                  confirmMessage={`¿Eliminar "${league.name}"? Sus ${members.length} miembros pasarán a la Quiniela Pública. Esta acción no se puede deshacer.`}
                  variant="outline"
                  size="sm"
                  label="Eliminar quiniela"
                  className="border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 hover:text-[var(--color-danger)]"
                />
              ) : (
                <LeaveButton leagueId={league.id} leagueName={league.name} />
              )
            }
          />
        </div>
      </div>

      {isOwner ? (
        <EditLeagueForm
          league={{
            id: league.id,
            name: league.name,
            logoUrl: league.logoUrl,
          }}
        />
      ) : null}

      {league.joinCode ? <CodeDisplay code={league.joinCode} /> : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <StatTile label="Miembros" value={members.length} accent />
        <StatTile
          label="Creada"
          value={formatDateTime(league.createdAt, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          textValue
        />
      </section>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <header className="flex items-center justify-between gap-3 pb-3 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          <span>Invite link</span>
        </header>
        <InviteLinkCopy token={league.inviteToken} />
        <p className="pt-3 font-editorial text-xs italic leading-relaxed text-[var(--color-muted-foreground)]">
          Quien tenga el enlace o el código entra directo. Ambos son fijos
          para siempre — no rotan.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          <span>Participantes</span>
          <span>{members.length}</span>
        </header>
        {members.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="Sin miembros"
            description="Comparte el código o el enlace de arriba para que se unan."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participante</TableHead>
                <TableHead className="hidden sm:table-cell">Alta</TableHead>
                <TableHead className="text-right">Pts</TableHead>
                {isOwner ? (
                  <TableHead className="w-16 text-right" aria-label="Acciones" />
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const display = m.nickname || m.email.split("@")[0];
                const points = pointsByUser.get(m.id) ?? 0;
                const isCreator = m.id === league.createdBy;
                const isMe = m.id === me.id;
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
                          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                            {display}
                            {isMe ? (
                              <Badge variant="outline" className="px-1.5 text-[0.55rem]">
                                Tú
                              </Badge>
                            ) : null}
                            {isCreator ? (
                              <Crown
                                className="size-3 text-[var(--color-arena)]"
                                aria-label="Creador"
                              />
                            ) : null}
                            {m.role === "admin" ? (
                              <ShieldCheck
                                className="size-3 text-[var(--color-arena)]"
                                aria-label="Admin"
                              />
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-xs text-[var(--color-muted-foreground)] sm:table-cell">
                      {formatDateTime(m.createdAt, { day: "2-digit", month: "short" })}
                    </TableCell>
                    <TableCell className="text-right font-display tabular text-base">
                      {points}
                    </TableCell>
                    {isOwner ? (
                      <TableCell className="text-right">
                        {!isMe && !isCreator ? (
                          <KickButton
                            userId={m.id}
                            userLabel={display}
                            leagueId={league.id}
                          />
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {isOwner ? (
        <p className="font-editorial text-xs italic leading-relaxed text-[var(--color-muted-foreground)]">
          <strong className="font-semibold not-italic">Quitar</strong> echa al
          miembro de esta quiniela; sus predicciones y puntos en esta liga
          quedan en su perfil pero deja de aparecer en el ranking.{" "}
          <strong className="font-semibold not-italic">Eliminar quiniela</strong>{" "}
          la borra entera y todos los miembros vuelven a la pública.
        </p>
      ) : null}
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
