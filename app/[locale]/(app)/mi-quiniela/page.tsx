import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ArrowRight, Building2, Crown, Download, Mail, Megaphone, Sparkles, ShieldCheck, Users } from "lucide-react";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  leagueDepartments,
  leagueMemberships,
  leagues,
  pointsLedger,
  profiles,
} from "@/lib/db/schema";
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
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, inLeagueFilter, isPremiumTier } from "@/lib/leagues";
import { canUseBranding, canUseDepartments } from "@/lib/league-tiers";
import { loadDepartmentRankings } from "@/lib/leaderboard";
import { buildDeptCards, type DeptCardData } from "./departamentos/dept-data";
import { MemberDepartmentsPanel } from "./departamentos/member-departments-panel";
import { getEffectiveTimeZone } from "@/lib/timezone-server";
import { formatDateTime, initials } from "@/lib/utils";
import { CollapsibleSection } from "@/components/shell/collapsible-section";
import { LeagueTabs } from "@/components/shell/league-tabs";
import { CodeDisplay } from "./code-display";
import { LeagueBrandingPanel } from "./league-branding-panel";
import { LeagueSettingsDialog } from "./league-settings-dialog";
import { KickButton, LeaveButton } from "./member-actions";
import { AnnouncementForm } from "./announcement-form";

export const metadata = { title: "Mi Quiniela" };
export const dynamic = "force-dynamic";

export default async function MyLeaguePage() {
  const me = await requireUser();
  const timeZone = await getEffectiveTimeZone();
  const t = await getTranslations("myPool");
  const tBranding = await getTranslations("branding");
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
  // Branding personalizado: solo Pase Empresa (100) o superior. El team-50
  // ve únicamente INFO y FUNCIONALIDADES.
  const canBrand = canUseBranding(league.tier);

  // Tab DEPARTAMENTOS/EQUIPOS para MIEMBROS (no-owner): solo si la liga es
  // premium con la feature y el admin ya creó departamentos.
  let memberDeptCards: DeptCardData[] | null = null;
  let myDeptId: number | null = null;
  if (!isOwner && canUseDepartments(league.tier)) {
    const [depts, rankings, memberships] = await Promise.all([
      db
        .select()
        .from(leagueDepartments)
        .where(eq(leagueDepartments.leagueId, league.id))
        .orderBy(asc(leagueDepartments.createdAt)),
      loadDepartmentRankings(league.id),
      db
        .select({
          userId: leagueMemberships.userId,
          departmentId: leagueMemberships.departmentId,
          joinedAt: leagueMemberships.joinedAt,
        })
        .from(leagueMemberships)
        .where(eq(leagueMemberships.leagueId, league.id)),
    ]);
    if (depts.length > 0) {
      const mById = new Map(memberships.map((m) => [m.userId, m]));
      memberDeptCards = buildDeptCards(
        depts,
        rankings,
        members.map((p) => ({
          userId: p.id,
          email: p.email,
          nickname: p.nickname,
          avatarUrl: p.avatarUrl,
          departmentId: mById.get(p.id)?.departmentId ?? null,
          joinedAt: (mById.get(p.id)?.joinedAt ?? p.createdAt).toISOString(),
          points: pointsByUser.get(p.id) ?? 0,
        })),
      );
      myDeptId = mById.get(me.id)?.departmentId ?? null;
    }
  }
  const memberLimit = league.memberLimit;
  const ratio = memberLimit != null ? members.length / memberLimit : 0;
  const isFull = memberLimit != null && members.length >= memberLimit;
  const nearLimit = memberLimit != null && ratio >= 0.8 && !isFull;

  return (
    <div className="space-y-8">
      {isOwner && isFull ? (
        <aside className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 p-4">
          <p className="font-editorial text-sm italic leading-relaxed">
            {t.rich("fullBanner", {
              limit: memberLimit,
              b: (chunks) => (
                <strong className="font-semibold not-italic">{chunks}</strong>
              ),
            })}
          </p>
          <Link
            href="/precios"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
          >
            {t("seePlans")} <ArrowRight className="size-3" />
          </Link>
        </aside>
      ) : null}

      {isOwner && nearLimit ? (
        <aside className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-4">
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
            {t("nearLimitBanner", { members: members.length, limit: memberLimit })}
          </p>
          <Link
            href="/precios"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-arena)]/40 bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-arena)] hover:bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)]"
          >
            {t("seePlans")} <ArrowRight className="size-3" />
          </Link>
        </aside>
      ) : null}

      <PageHeader
        eyebrow={t("eyebrowPrivate")}
        title={league.name}
        description={isOwner ? t("descOwner") : t("descMember")}
        actions={
          isOwner ? (
            <LeagueSettingsDialog
              league={{
                id: league.id,
                name: league.name,
                logoUrl: league.logoUrl,
                isPremium,
              }}
              memberCount={members.length}
            />
          ) : (
            <LeaveButton leagueId={league.id} leagueName={league.name} />
          )
        }
      />

      {isOwner && isPremium ? (
        <LeagueTabs
          tabs={[
            {
              id: "info",
              label: tBranding("tabInfo"),
              content: (
                <LeagueInfoContent
                  league={league}
                  members={members}
                  pointsByUser={pointsByUser}
                  isOwner={isOwner}
                  meId={me.id}
                  memberLimit={memberLimit}
                  isPremium={isPremium}
                  showUpgrade={false}
                  timeZone={timeZone}
                />
              ),
            },
            ...(canBrand
              ? [
                  {
                    id: "branding",
                    label: tBranding("tabBranding"),
                    content: (
                      <LeagueBrandingPanel
                        leagueId={league.id}
                        initialLogoUrl={league.logoUrl}
                        initialBrandUrl={league.brandLogoUrl}
                        initialBrandLightUrl={league.brandLogoLightUrl}
                      />
                    ),
                  },
                ]
              : []),
            {
              id: "features",
              label: tBranding("tabFeatures"),
              content: (
                <FeaturesPanel
                  leagueId={league.id}
                  leagueName={league.name}
                  announcement={league.announcement}
                />
              ),
            },
          ]}
        />
      ) : memberDeptCards ? (
        <LeagueTabs
          tabs={[
            {
              id: "info",
              label: tBranding("tabInfo"),
              content: (
                <LeagueInfoContent
                  league={league}
                  members={members}
                  pointsByUser={pointsByUser}
                  isOwner={isOwner}
                  meId={me.id}
                  memberLimit={memberLimit}
                  isPremium={isPremium}
                  showUpgrade={false}
                  timeZone={timeZone}
                />
              ),
            },
            {
              id: "depts",
              label: t("deptCardTitle"),
              content: (
                <MemberDepartmentsPanel
                  leagueId={league.id}
                  myDeptId={myDeptId}
                  cards={memberDeptCards}
                />
              ),
            },
          ]}
        />
      ) : (
        <LeagueInfoContent
          league={league}
          members={members}
          pointsByUser={pointsByUser}
          isOwner={isOwner}
          meId={me.id}
          memberLimit={memberLimit}
          isPremium={isPremium}
          showUpgrade={isOwner && !isPremium}
          timeZone={timeZone}
        />
      )}
    </div>
  );
}

/**
 * Panel INFO: invitación (código + link) + stats + participantes + footer.
 * Compartido por la tab INFO (premium) y la vista secuencial (no-premium).
 */
function LeagueInfoContent({
  league,
  members,
  pointsByUser,
  isOwner,
  meId,
  memberLimit,
  isPremium,
  showUpgrade,
  timeZone,
}: {
  league: typeof leagues.$inferSelect;
  members: (typeof profiles.$inferSelect)[];
  pointsByUser: Map<string, number>;
  isOwner: boolean;
  meId: string;
  memberLimit: number | null;
  isPremium: boolean;
  showUpgrade: boolean;
  timeZone: string;
}) {
  const t = useTranslations("myPool");
  const tModes = useTranslations("modes");
  return (
    <div className="space-y-8">
      {league.joinCode ? (
        <CodeDisplay code={league.joinCode} inviteToken={league.inviteToken} />
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label={t("statMembers")}
          value={
            memberLimit != null
              ? `${members.length} / ${memberLimit}`
              : String(members.length)
          }
          accent
          textValue
        />
        <StatTile
          label={t("statPlan")}
          value={isPremium ? t("planPremium") : t("planFree")}
          textValue
        />
        <StatTile
          label={t("statMode")}
          value={tModes(league.predictionMode)}
          textValue
        />
      </section>

      {showUpgrade ? (
        <UpgradePromo currentMembers={members.length} currentLimit={memberLimit} />
      ) : null}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          <span>{t("participants")}</span>
          <span>{members.length}</span>
        </header>
        {members.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title={t("noMembersTitle")}
            description={t("noMembersDesc")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("thParticipant")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("thJoined")}</TableHead>
                <TableHead className="text-right">{t("thPts")}</TableHead>
                {isOwner ? (
                  <TableHead className="w-16 text-right" aria-label={t("actionsAria")} />
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const display = m.nickname || m.email.split("@")[0];
                const points = pointsByUser.get(m.id) ?? 0;
                const isCreator = m.id === league.createdBy;
                const isMe = m.id === meId;
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
                                {t("you")}
                              </Badge>
                            ) : null}
                            {isCreator ? (
                              <Crown
                                className="size-3 text-[var(--color-arena)]"
                                aria-label={t("creatorAria")}
                              />
                            ) : null}
                            {m.role === "admin" ? (
                              <ShieldCheck
                                className="size-3 text-[var(--color-arena)]"
                                aria-label={t("adminAria")}
                              />
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-xs text-[var(--color-muted-foreground)] sm:table-cell">
                      {formatDateTime(m.createdAt, { timeZone, day: "2-digit", month: "short" })}
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
          {t.rich("footerNote", {
            b: (chunks) => (
              <strong className="font-semibold not-italic">{chunks}</strong>
            ),
          })}
        </p>
      ) : null}
    </div>
  );
}

/** Panel FUNCIONALIDADES: anuncio fijado (plegable) + cards de features. */
function FeaturesPanel({
  leagueId,
  leagueName,
  announcement,
}: {
  leagueId: number;
  leagueName: string;
  announcement: string | null;
}) {
  const t = useTranslations("myPool");
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/mi-quiniela/departamentos"
          className="flex items-center gap-3 rounded-xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] p-4 transition hover:border-[var(--color-arena)]/60"
        >
          <span className="grid size-9 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
            <Building2 className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <span className="font-display text-sm tracking-tight">{t("deptCardTitle")}</span>
              <PremiumPill />
            </p>
            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              {t("deptCardDesc")}
            </p>
          </div>
        </Link>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/mi-quiniela/export"
          className="flex items-center gap-3 rounded-xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] p-4 transition hover:border-[var(--color-arena)]/60"
        >
          <span className="grid size-9 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
            <Download className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <span className="font-display text-sm tracking-tight">{t("exportCardTitle")}</span>
              <PremiumPill />
            </p>
            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              {t("exportCardDesc")}
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
            <p className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-display text-sm tracking-tight">
                {t("supportCardTitle")} <Sparkles className="size-3" />
              </span>
              <PremiumPill />
            </p>
            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              {t("supportCardDesc")}
            </p>
          </div>
        </a>
      </div>

      {/* Anuncio fijado — debajo de los otros 3 features, plegado por defecto */}
      <CollapsibleSection
        title={t("annTitle")}
        description={t("annShort")}
        badge="PREMIUM"
        icon={<Megaphone className="size-4" />}
      >
        <AnnouncementForm
          leagueId={leagueId}
          leagueName={leagueName}
          initialValue={announcement}
        />
      </CollapsibleSection>
    </div>
  );
}

/** Pill "PREMIUM" — mismo estilo que el badge del plegable. */
function PremiumPill() {
  return (
    <span className="rounded-full bg-[var(--color-arena)] px-1.5 py-px text-[0.55rem] font-semibold tracking-[0.12em] text-white">
      PREMIUM
    </span>
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
  const t = useTranslations("myPool");
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
              {t("promoEyebrow")}
            </p>
          </div>
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            {t("promoTitle")}
          </h2>
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
            {t("promoDesc", { limit: currentLimit ?? 20, members: currentMembers })}
          </p>

          <ul className="grid gap-1.5 pt-1 sm:grid-cols-2">
            <PromoBullet>{t("promoBullet1")}</PromoBullet>
            <PromoBullet>{t("promoBullet2")}</PromoBullet>
            <PromoBullet>{t("promoBullet3")}</PromoBullet>
            <PromoBullet>{t("promoBullet4")}</PromoBullet>
          </ul>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <p className="font-display tabular text-4xl tracking-tight text-[var(--color-arena)] glow-arena">
            {t("promoFrom")}
          </p>
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {t("promoOneTime")}
          </p>
          <Link
            href="/precios"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
          >
            {t("seePlans")} <ArrowRight className="size-3.5" />
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
