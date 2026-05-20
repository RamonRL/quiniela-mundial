import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueMemberships, leagues } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/lib/league-actions";
import { ArrowRight, Trophy, Users } from "lucide-react";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InviteLandingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

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
  }

  return (
    <div className="relative grid min-h-dvh place-items-center px-6 py-12">
      <div className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden />
      <div className="relative w-full max-w-md space-y-8 rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] p-8 shadow-[var(--shadow-elev-2)] sm:p-10">
        <header className="space-y-3 text-center">
          {league.logoUrl ? (
            <Avatar className="mx-auto size-20 border-2 border-[var(--color-arena)]/40 shadow-[var(--shadow-arena)]">
              <AvatarImage src={league.logoUrl} alt={league.name} />
              <AvatarFallback className="font-display text-2xl tracking-tight">
                {initials(league.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="mx-auto inline-flex size-12 place-items-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
              <Trophy className="size-5" />
            </span>
          )}
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
            Invitación a una quiniela privada
          </p>
          <h1 className="font-display text-4xl tracking-tight">{league.name}</h1>
          {league.joinCode ? (
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Código · <span className="text-[var(--color-arena)]">{league.joinCode}</span>
            </p>
          ) : null}
        </header>

        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
            <span className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
              <Users className="size-3.5" />
              Miembros
            </span>
            <span className="font-display tabular text-base">{memberCount?.count ?? 0}</span>
          </div>
          <p className="font-editorial text-xs italic leading-relaxed text-[var(--color-muted-foreground)]">
            Al aceptar verás solo a los participantes y al ranking de esta liga. El resto del
            Mundial 26 (calendario, partidos, jugadores) es el mismo que ve todo el mundo.
          </p>
        </div>

        <form action={accept}>
          <Button type="submit" size="lg" className="w-full">
            Aceptar invitación
            <ArrowRight />
          </Button>
        </form>

        <p className="text-center font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="underline">
            Inicia sesión
          </Link>{" "}
          y vuelve a este enlace.
        </p>
      </div>
    </div>
  );
}
