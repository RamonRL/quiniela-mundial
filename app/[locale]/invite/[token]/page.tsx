import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueMemberships, leagues } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { acceptInvite } from "@/lib/league-actions";
import { isPremiumTier } from "@/lib/league-tiers";
import { ArrowRight, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InviteLandingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
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

  // Premium con branding → su marca (variante oscura/única) en vez del
  // wordmark de Quiniela Mundial.
  const brandUrl = isPremiumTier(league.tier) ? league.brandLogoUrl : null;

  // Server action wrapper. acceptInvite redirige por sí solo en los casos
  // OK; si devuelve `private_limit_reached` lanzamos un error con el copy
  // adecuado para que la error boundary lo recoja.
  async function accept() {
    "use server";
    const res = await acceptInvite(token);
    if (res.status === "private_limit_reached") {
      throw new Error(
        `Ya tienes 5 quinielas privadas. Para unirte a "${res.leagueName}" abandona alguna desde tu perfil.`,
      );
    }
    if (res.status === "league_full") {
      throw new Error(
        `"${res.leagueName}" ya está completa (${res.limit ?? "tope"} miembros). El creador puede ampliarla con un Pase Mundial 2026 — más info en /precios.`,
      );
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center px-6 py-12">
      <div className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden />
      <div className="relative w-full max-w-md space-y-8 rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] p-8 shadow-[var(--shadow-elev-2)] sm:p-10">
        <header className="space-y-3 text-center">
          {/* Wordmark de QM, o la marca de la empresa si es premium con branding */}
          <div className="mb-5 flex justify-center">
            {brandUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandUrl}
                alt={league.name}
                className="h-12 w-auto max-w-[15rem] rounded-md object-contain"
              />
            ) : (
              <BrandWordmark priority className="h-12 w-auto" />
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

        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
            <span className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
              <Users className="size-3.5" />
              {t("members")}
            </span>
            <span className="font-display tabular text-base">
              {memberCount?.count ?? 0}
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

        <form action={accept}>
          <Button type="submit" size="lg" className="w-full">
            {t("accept")}
            <ArrowRight />
          </Button>
        </form>

        <p className="text-center font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
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
