import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Award, Building2, Crown, Medal, Sparkles, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { loadChampionsRanking, type ChampionRankingEntry } from "@/lib/leaderboard";
import { initials } from "@/lib/utils";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quinielamundial.es";

export const metadata: Metadata = {
  title: "Champions de Empresas",
  description:
    "La copa entre empresas del Mundial 2026. Todas las empresas con plan de pago compiten por media de puntos. Premio físico al ganador.",
  alternates: { canonical: "/champions-empresas" },
  openGraph: {
    title: "Champions de Empresas · Mundial 2026",
    description:
      "Todas las empresas con plan de pago compiten en una sola liga global. Premio físico para la ganadora.",
    url: `${SITE_URL}/champions-empresas`,
  },
};

const TIER_LABEL: Record<string, string> = {
  "team-50": "Plan 50",
  "team-100": "Plan 100",
  "team-250": "Plan 250",
  enterprise: "Enterprise",
};

export default async function ChampionsEmpresasPage() {
  const rankings = await loadChampionsRanking();
  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="space-y-10">
      {/* JSON-LD evento secundario */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            name: "Champions de Empresas · Mundial 2026",
            description:
              "Ranking entre todas las empresas con plan de pago en Quiniela Mundial 2026. La empresa con mayor media de puntos al final del Mundial gana un trofeo físico y difusión.",
            startDate: "2026-06-11",
            endDate: "2026-07-19",
            url: `${SITE_URL}/champions-empresas`,
            superEvent: {
              "@type": "SportsEvent",
              name: "Copa Mundial de la FIFA 2026",
              url: SITE_URL,
            },
            organizer: {
              "@type": "Organization",
              name: "Quiniela Mundial",
              url: SITE_URL,
            },
          }),
        }}
      />

      <PageHeader
        eyebrow="Quiniela · Plan empresa"
        title="Champions de Empresas"
        description="Todas las empresas con un Pase Mundial 2026 compiten en una sola liga. Gana la que tenga mayor media de puntos al cierre del torneo."
      />

      {/* ─── Card del trofeo ─── */}
      <section className="overflow-hidden rounded-2xl border-2 border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))]">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="flex shrink-0 items-center justify-center">
            <div className="relative">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[var(--color-arena)] blur-2xl opacity-40"
              />
              <span className="relative grid size-28 place-items-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
                <Trophy className="size-14" />
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="font-display text-3xl tracking-tight">El trofeo</h2>
            <p className="font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)]">
              Trofeo físico personalizado para la empresa ganadora + difusión en nuestras
              redes (TikTok &amp; X). Lo enviamos a la dirección de la oficina nada más
              cerrar la final.
            </p>
            <ul className="space-y-1.5 font-editorial text-sm leading-relaxed">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--color-arena)]" />
                <span>
                  <strong>Periodo</strong>: 11 jun → 19 jul 2026.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--color-arena)]" />
                <span>
                  <strong>Ganador</strong>: empresa con mayor media de puntos al cerrar el
                  Mundial.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--color-arena)]" />
                <span>
                  <strong>Inscripción</strong>: automática al activar cualquier Pase
                  Mundial 2026 (Plan 50, 100 o 250).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--color-arena)]" />
                <span>
                  <strong>Anti-cheat</strong>: solo se promedian los miembros que envían
                  al menos una predicción. Los inactivos no penalizan.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Leaderboard ─── */}
      {rankings.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-5" />}
          title="Aún no hay empresas inscritas"
          description="Activa un Pase Mundial 2026 y entra al ranking automáticamente."
        />
      ) : (
        <>
          <section className="grid items-end gap-3 sm:grid-cols-3">
            {top3.map((c, i) => {
              const position = (i + 1) as 1 | 2 | 3;
              return <ChampionPodiumCard key={c.leagueId} position={position} entry={c} />;
            })}
          </section>

          {rest.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-px w-6 bg-[var(--color-arena)]" />
                <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                  Posiciones · 4 y siguientes
                </h2>
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="grid grid-cols-[56px_1fr_88px_72px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
                  <span>Pos</span>
                  <span>Empresa</span>
                  <span className="text-right">Media</span>
                  <span className="text-right">Activos</span>
                </div>
                <ul>
                  {rest.map((c, i) => {
                    const position = i + 4;
                    return (
                      <li
                        key={c.leagueId}
                        className="grid grid-cols-[56px_1fr_88px_72px] items-center gap-2 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0"
                      >
                        <span className="font-display text-2xl tabular text-[var(--color-muted-foreground)]">
                          {position.toString().padStart(2, "0")}
                        </span>
                        <span className="flex items-center gap-3 truncate">
                          <Avatar className="size-8 border border-[var(--color-border)]">
                            {c.logoUrl ? <AvatarImage src={c.logoUrl} alt="" /> : null}
                            <AvatarFallback>{initials(c.leagueName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{c.leagueName}</p>
                            <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                              {TIER_LABEL[c.tier] ?? c.tier}
                            </p>
                          </div>
                        </span>
                        <span className="text-right font-display tabular text-xl">
                          {c.avgPoints}
                        </span>
                        <span className="text-right text-sm tabular text-[var(--color-muted-foreground)]">
                          {c.activeMembers}/{c.totalMembers}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ) : null}
        </>
      )}

      {/* ─── CTA final ─── */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl tracking-tight">¿Tu empresa quiere competir?</h2>
            <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              Activa un Pase Mundial 2026 (50, 100 o 250 miembros). La inscripción a la
              Champions es automática.
            </p>
          </div>
          <Link
            href="/precios"
            className="inline-flex items-center gap-2 self-start rounded-md bg-[var(--color-arena)] px-5 py-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90 sm:self-auto"
          >
            Ver precios <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function ChampionPodiumCard({
  position,
  entry,
}: {
  position: 1 | 2 | 3;
  entry: ChampionRankingEntry;
}) {
  const layout = {
    1: { order: "sm:order-2", height: "h-52", icon: Crown, label: "ORO" },
    2: { order: "sm:order-1", height: "h-44", icon: Medal, label: "PLATA" },
    3: { order: "sm:order-3", height: "h-40", icon: Award, label: "BRONCE" },
  }[position];
  const Icon = layout.icon;
  return (
    <div
      className={`relative flex flex-col justify-between gap-3 rounded-xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-4 ${layout.order} ${layout.height}`}
    >
      <div className="flex items-center justify-between">
        <Icon className="size-4 text-[var(--color-arena)]" />
        <Badge variant="outline" className="text-[0.55rem]">
          #{position} · {layout.label}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <Avatar className="size-12 border-2 border-[var(--color-arena)]/40">
          {entry.logoUrl ? <AvatarImage src={entry.logoUrl} alt="" /> : null}
          <AvatarFallback>{initials(entry.leagueName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-display text-lg leading-tight tracking-tight">
            {entry.leagueName}
          </p>
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            {TIER_LABEL[entry.tier] ?? entry.tier} · {entry.activeMembers} activos
          </p>
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Media
        </span>
        <span className="font-display text-3xl tabular">{entry.avgPoints}</span>
      </div>
    </div>
  );
}
