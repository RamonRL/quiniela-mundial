import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueMemberships, leagues } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { acceptInvite } from "@/lib/league-actions";
import { isPremiumTier } from "@/lib/league-tiers";
import { ArrowRight, Users, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InviteLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ full?: string; limit?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const t = await getTranslations("invite");

  const [league] = await db
    .select()
    .from(leagues)
    .where(and(eq(leagues.inviteToken, token), eq(leagues.isPublic, false)))
    .limit(1);
  if (!league) notFound();

  const [memberCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leagueMemberships)
    .where(eq(leagueMemberships.leagueId, league.id));
  const count = memberCount?.count ?? 0;

  // Llena: el cupo ya está alcanzado (o una carrera la llenó justo al aceptar,
  // que vuelve aquí con ?full=1). En ese caso no mostramos "Aceptar".
  const isFull =
    sp.full === "1" || (league.memberLimit != null && count >= league.memberLimit);
  const limitReached = sp.limit === "1";

  // Premium con branding → su marca (variante oscura/única) en vez del
  // wordmark de Quiniela Mundial.
  const brandUrl = isPremiumTier(league.tier) ? league.brandLogoUrl : null;

  // Server action. acceptInvite redirige por sí solo en los casos OK; si la
  // liga está llena o el usuario llegó a su tope de privadas, volvemos a esta
  // misma página con un flag para mostrar un mensaje claro (sin error boundary).
  async function accept() {
    "use server";
    const res = await acceptInvite(token);
    if (res.status === "league_full") {
      redirect(`/invite/${token}?full=1`);
    }
    if (res.status === "private_limit_reached") {
      redirect(`/invite/${token}?limit=1`);
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center px-6 py-12">
      <div className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] p-8 shadow-[var(--shadow-elev-2)] sm:p-10">
        <header className="space-y-3 text-center">
          {/* Wordmark de QM, o la marca de la empresa si es premium con
              branding. Sube un poco (-mt-2), 10% más grande (h-12→3.3rem) y
              con más aire hasta el eyebrow (mb-9). */}
          <div className="-mt-2 mb-9 flex justify-center">
            {brandUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandUrl}
                alt={league.name}
                className="h-[3.3rem] w-auto max-w-[16.5rem] rounded-md object-contain"
              />
            ) : (
              <BrandWordmark priority className="h-[3.3rem] w-auto" />
            )}
          </div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-[var(--color-arena)]">
            {t("eyebrow")}
          </p>
          <h1 className="font-display text-4xl tracking-tight">{league.name}</h1>
          {league.joinCode ? (
            <p className="font-mono text-sm uppercase tracking-[0.26em] text-[var(--color-muted-foreground)]">
              {t("code")} ·{" "}
              <span className="font-semibold text-[var(--color-arena)]">
                {league.joinCode}
              </span>
            </p>
          ) : null}
        </header>

        {/* Texto del header un poco más pegado a Miembros (mt-5 vs el 2rem
            de antes); el resto de bloques conservan su separación original. */}
        <div className="mt-5 grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
            <span className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
              <Users className="size-3.5" />
              {t("members")}
            </span>
            <span
              className={`font-display tabular text-base ${isFull ? "text-[var(--color-arena)]" : ""}`}
            >
              {count}
              {league.memberLimit != null ? (
                <span className="text-[var(--color-muted-foreground)]">
                  {" "}
                  / {league.memberLimit}
                </span>
              ) : null}
            </span>
          </div>
          <p className="font-editorial text-xs italic leading-relaxed text-[var(--color-muted-foreground)]">
            {t("note")}
          </p>
        </div>

        {isFull ? (
          // Liga completa → sin botón de aceptar; mensaje claro + enlace a planes.
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] px-4 py-3">
              <Lock className="mt-0.5 size-4 shrink-0 text-[var(--color-arena)]" />
              <div className="space-y-1">
                <p className="font-display text-sm tracking-tight text-[var(--color-arena)]">
                  {t("fullTitle")}
                </p>
                <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                  {t("fullBody")}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/precios">
                {t("fullCta")}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : limitReached ? (
          // Usuario en su tope de 5 privadas.
          <div className="mt-8 flex items-start gap-3 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-foreground)]" />
            <div className="space-y-1">
              <p className="font-display text-sm tracking-tight">{t("limitTitle")}</p>
              <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                {t("limitBody")}
              </p>
            </div>
          </div>
        ) : (
          <form action={accept} className="mt-8">
            <Button type="submit" size="lg" className="w-full">
              {t("accept")}
              <ArrowRight />
            </Button>
          </form>
        )}

        <p className="mt-8 text-center font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {t.rich("haveAccount", {
            link: (chunks) => (
              <Link href="/login" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
