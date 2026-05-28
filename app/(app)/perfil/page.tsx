import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/lib/auth/guards";
import {
  PRIVATE_LEAGUES_PER_USER_LIMIT,
  getMembershipsForUser,
} from "@/lib/leagues";
import { getPickCountsByLeague } from "@/lib/import-predictions";
import { initials } from "@/lib/utils";
import { ProfileForm } from "./profile-form";
import { MyLeaguesSection } from "./my-leagues-section";

export const metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const me = await requireUser();
  const display = me.nickname || me.email.split("@")[0];
  const memberships = await getMembershipsForUser(me.id);
  const privateCount = memberships.filter((m) => !m.isPublic).length;
  // Picks por liga (solo de las ligas del usuario) para alimentar el botón
  // "Copiar predicciones" — visible cuando una liga tiene menos picks que otra
  // a la que el usuario pertenece. Convertimos a objeto plano serializable
  // para pasarlo al client component sin pérdida.
  const pickCounts = await getPickCountsByLeague(me.id);
  const pickCountByLeagueId: Record<number, number> = {};
  for (const m of memberships) {
    pickCountByLeagueId[m.id] = pickCounts.get(m.id) ?? 0;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cuenta"
        title="Mi perfil"
        description="Apodo y avatar."
      />

      {/* Tu ficha — vista pública resumida + atajo al detalle de participante */}
      <Link
        href={`/ranking/${me.id}`}
        className="group relative block overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-arena)]/40 sm:p-6"
      >
        <div className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 border border-[var(--color-border-strong)]">
              {me.avatarUrl ? <AvatarImage src={me.avatarUrl} alt="" /> : null}
              <AvatarFallback className="text-base">{initials(display)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                Cómo te ven los demás
              </p>
              <p className="font-display text-2xl tracking-tight">
                {display}
                {me.role === "admin" ? (
                  <Badge variant="outline" className="ml-2 align-middle text-[0.55rem]">
                    Admin
                  </Badge>
                ) : null}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)] group-hover:underline">
            Ver mi ficha completa <ArrowUpRight className="size-3" />
          </span>
        </div>
      </Link>

      <ProfileForm
        email={me.email}
        nickname={me.nickname}
        avatarUrl={me.avatarUrl}
      />

      <MyLeaguesSection
        memberships={memberships}
        activeLeagueId={me.leagueId}
        privateCount={privateCount}
        privateLimit={PRIVATE_LEAGUES_PER_USER_LIMIT}
        pickCountByLeagueId={pickCountByLeagueId}
      />
    </div>
  );
}
