import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, Crown, Download, Mail, Megaphone, Sparkles, ShieldCheck, Users } from "lucide-react";
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
import { currentLeagueId, inLeagueFilter, isPremiumTier } from "@/lib/leagues";
import { deleteOwnLeague } from "@/lib/league-actions";
import { formatDateTime, initials } from "@/lib/utils";
import { InviteLinkCopy } from "@/app/admin/ligas/invite-link-copy";
import { CodeDisplay } from "./code-display";
import { EditLeagueDialog } from "./edit-league-dialog";
import { KickButton, LeaveButton } from "./member-actions";
import { AnnouncementForm } from "./announcement-form";

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
  const isPremium = isPremiumTier(league.tier);
  const memberLimit = league.memberLimit;
  const ratio = memberLimit != null ? members.length / memberLimit : 0;
  const isFull = memberLimit != null && members.length >= memberLimit;
  const nearLimit = memberLimit != null && ratio >= 0.8 && !isFull;

  return (
    <div className="space-y-8">
      {league.announcement ? (
        <aside className="flex items-start gap-3 rounded-xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] p-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
            <Megaphone className="size-4" />
          </span>
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-foreground)]">
            {league.announcement}
          </p>
        </aside>
      ) : null}

      {isOwner && isFull ? (
        <aside className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 p-4">
          <p className="font-editorial text-sm italic leading-relaxed">
            <strong className="font-semibold not-italic">
              Quiniela completa ({memberLimit}/{memberLimit} miembros).
            </strong>{" "}
            Para que entren más, contrata un Pase Mundial 2026 — sin migrar
            datos, mismo grupo.
          </p>
          <Link
            href="/precios"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
          >
            Ver planes <ArrowRight className="size-3" />
          </Link>
        </aside>
      ) : null}

      {isOwner && nearLimit ? (
        <aside className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-4">
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
            Estás cerca del límite ({members.length}/{memberLimit}). ¿Tu grupo
            va a crecer?
          </p>
          <Link
            href="/precios"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-arena)]/40 bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-arena)] hover:bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)]"
          >
            Ver planes <ArrowRight className="size-3" />
          </Link>
        </aside>
      ) : null}

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
                <div className="flex items-center gap-2">
                  <EditLeagueDialog
                    league={{
                      id: league.id,
                      name: league.name,
                      logoUrl: league.logoUrl,
                      isPremium,
                    }}
                  />
                  <DeleteButton
                    action={deleteOwnLeague}
                    id={league.id}
                    confirmMessage={`¿Eliminar "${league.name}"? Sus ${members.length} miembros pasarán a la Quiniela Pública. Esta acción no se puede deshacer.`}
                    variant="outline"
                    size="sm"
                    label="Eliminar"
                    className="border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 hover:text-[var(--color-danger)]"
                  />
                </div>
              ) : (
                <LeaveButton leagueId={league.id} leagueName={league.name} />
              )
            }
          />
        </div>
      </div>

      {isOwner && isPremium ? (
        <AnnouncementForm leagueId={league.id} initialValue={league.announcement} />
      ) : null}

      {league.joinCode ? <CodeDisplay code={league.joinCode} /> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Miembros"
          value={
            memberLimit != null ? `${members.length} / ${memberLimit}` : String(members.length)
          }
          accent
          textValue
        />
        <StatTile
          label="Plan"
          value={isPremium ? "Pase Mundial 2026" : "Free"}
          textValue
        />
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

      {isOwner && !isPremium ? (
        <UpgradePromo
          currentMembers={members.length}
          currentLimit={memberLimit}
        />
      ) : null}

      {isOwner && isPremium ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/mi-quiniela/departamentos"
            className="flex items-center gap-3 rounded-xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] p-4 transition hover:border-[var(--color-arena)]/60"
          >
            <span className="grid size-9 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
              <Building2 className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm tracking-tight">Departamentos</p>
              <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                Sub-grupos con ranking por media de puntos.
              </p>
            </div>
          </Link>
          <a
            href="/mi-quiniela/export"
            className="flex items-center gap-3 rounded-xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] p-4 transition hover:border-[var(--color-arena)]/60"
          >
            <span className="grid size-9 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
              <Download className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm tracking-tight">Exportar CSV</p>
              <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                Ranking completo con email y puntos.
              </p>
            </div>
          </a>
          <a
            href="mailto:admin@quinielamundial.es?subject=Soporte%20Pase%20Mundial%202026"
            className="flex items-center gap-3 rounded-xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] p-4 transition hover:border-[var(--color-arena)]/60"
          >
            <span className="grid size-9 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
              <Mail className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-display text-sm tracking-tight">
                Soporte prioritario <Sparkles className="size-3" />
              </p>
              <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                Respondo en menos de 24 h.
              </p>
            </div>
          </a>
        </section>
      ) : null}

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

/**
 * Promo persistente para owners de ligas Free dentro de /mi-quiniela.
 * Complementa los banners `isFull` / `nearLimit` (que solo aparecen
 * bajo presión) con info pasiva: qué desbloquea pagar, aunque tengan
 * el límite muy lejos. Una sola CTA a /precios. Sin sticky, sin
 * pop-ups — sección normal del scroll.
 */
function UpgradePromo({
  currentMembers,
  currentLimit,
}: {
  currentMembers: number;
  currentLimit: number | null;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-5 sm:p-6">
      <div
        aria-hidden
        className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--color-arena) 28%, transparent), transparent 70%)",
        }}
      />

      <div className="relative grid gap-5 lg:grid-cols-[1.2fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2">
            <Crown className="size-3.5 text-[var(--color-arena)]" />
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
              Pase Mundial 2026
            </p>
          </div>
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            Hazlo el ritual de oficina del Mundial
          </h2>
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
            Tu liga Free está topada a {currentLimit ?? 20} miembros (vais {currentMembers}). Con un Pase ampliamos a 50, 100 o 250 y desbloqueamos las funciones pensadas para grupos grandes.
          </p>

          <ul className="grid gap-1.5 pt-1 sm:grid-cols-2">
            <PromoBullet>Departamentos internos con ranking por media</PromoBullet>
            <PromoBullet>Hasta 250 miembros por liga</PromoBullet>
            <PromoBullet>Logo corporativo + anuncio fijado</PromoBullet>
            <PromoBullet>Export CSV del ranking y soporte prioritario</PromoBullet>
          </ul>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <p className="font-display tabular text-4xl tracking-tight text-[var(--color-arena)] glow-arena">
            desde 19 €
          </p>
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            Pago único · sin renovación
          </p>
          <Link
            href="/precios"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
          >
            Ver planes <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PromoBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Sparkles className="mt-0.5 size-3 shrink-0 text-[var(--color-arena)]" />
      <span className="font-editorial text-xs italic leading-snug">{children}</span>
    </li>
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
