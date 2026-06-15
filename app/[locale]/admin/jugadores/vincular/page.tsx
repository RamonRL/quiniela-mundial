import Link from "next/link";
import { asc, eq, isNull, sql } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { players, teams } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import { localizedTeamName } from "@/lib/team-names";
import {
  fetchLeagueTeams,
  fetchTeamSquad,
} from "@/lib/sports/api-football";
import {
  ambiguousSurnames,
  norm,
  proposeApiMatch,
  PROVIDER_TEAM_ALIASES,
} from "@/lib/sports/player-matching";
import { LinkForm } from "./link-form";

export const metadata = { title: "Vincular jugadores · Admin" };
export const dynamic = "force-dynamic";

export default async function VincularPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  await requireAdmin();
  const { team: teamCode } = await searchParams;

  // Conteo de jugadores SIN providerPlayerId por equipo (rápido, sin API).
  const counts = await db
    .select({
      teamId: players.teamId,
      missing: sql<number>`count(*) filter (where ${players.providerPlayerId} is null)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(players)
    .groupBy(players.teamId);
  const missingByTeam = new Map(counts.map((c) => [c.teamId, c]));

  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));
  const selected = teamCode ? allTeams.find((t) => t.code === teamCode) ?? null : null;

  // Escaneo del equipo seleccionado (2 llamadas a API-Football).
  let scan: Awaited<ReturnType<typeof scanTeam>> | null = null;
  let scanError: string | null = null;
  if (selected) {
    try {
      scan = await scanTeam(selected.id, selected.code, selected.name);
    } catch (e) {
      scanError = e instanceof Error ? e.message : "Fallo al escanear con API-Football.";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Jugadores"
        title="Vincular con API-Football"
        description="Empareja nuestros jugadores con la plantilla del proveedor para que ningún goleador caiga a 'pendiente'. Las propuestas son sugerencias: revísalas antes de guardar."
      />

      <Link
        href="/admin/jugadores"
        className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] hover:text-[var(--color-arena)]"
      >
        <ArrowLeft className="size-3.5" /> Volver a jugadores
      </Link>

      {/* Selector de selección con contador de pendientes */}
      <section className="flex flex-wrap gap-1.5">
        {allTeams.map((t) => {
          const miss = missingByTeam.get(t.id)?.missing ?? 0;
          const active = selected?.id === t.id;
          return (
            <Link
              key={t.id}
              href={`/admin/jugadores/vincular?team=${t.code}`}
              className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition ${
                active
                  ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_14%,transparent)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-arena)]/40"
              }`}
            >
              <span className="font-mono text-xs">{t.code}</span>
              {miss > 0 ? (
                <span className="rounded-full bg-[var(--color-arena)] px-1.5 text-[0.65rem] font-semibold text-white">
                  {miss}
                </span>
              ) : (
                <span className="text-[0.65rem] text-[var(--color-muted-foreground)]">✓</span>
              )}
            </Link>
          );
        })}
      </section>

      {!selected ? (
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          Elige una selección. El número rojo es cuántos jugadores le faltan por vincular.
        </p>
      ) : scanError ? (
        <p className="text-sm text-[var(--color-destructive)]">⚠️ {scanError}</p>
      ) : scan ? (
        scan.rows.length === 0 ? (
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {selected.name}: todos los jugadores ya están vinculados. ✓
          </p>
        ) : (
          <LinkForm
            teamName={selected.name}
            rows={scan.rows}
            apiOptions={scan.apiOptions}
            apiUnmatched={scan.apiUnmatched}
          />
        )
      ) : null}
    </div>
  );
}

/** Resuelve la plantilla del proveedor y propone vínculos para el equipo. */
async function scanTeam(teamId: number, code: string, name: string) {
  // Resolver el id de equipo del proveedor por nombre (EN/ES/alias).
  const apiTeams = await fetchLeagueTeams();
  const wantNames = new Set(
    [norm(localizedTeamName(code, name, "en")), norm(name)].filter(Boolean),
  );
  for (const [alias, c] of Object.entries(PROVIDER_TEAM_ALIASES)) {
    if (c === code) wantNames.add(alias);
  }
  const apiTeam = apiTeams.find(({ team }) => wantNames.has(norm(team.name)));
  if (!apiTeam) throw new Error(`No encuentro "${name}" en API-Football (revisa el nombre/alias).`);

  const squadRes = await fetchTeamSquad(apiTeam.team.id);
  const squad = squadRes[0]?.players ?? [];
  if (squad.length === 0) throw new Error("API-Football no devolvió plantilla para este equipo.");

  const ours = await db
    .select({
      id: players.id,
      name: players.name,
      jerseyNumber: players.jerseyNumber,
      providerPlayerId: players.providerPlayerId,
    })
    .from(players)
    .where(eq(players.teamId, teamId))
    .orderBy(asc(players.jerseyNumber));

  const takenApiIds = new Set(
    ours.map((p) => p.providerPlayerId).filter((x): x is number => x != null),
  );
  const available = squad.filter((a) => !takenApiIds.has(a.id));
  const unmatched = ours.filter((p) => p.providerPlayerId == null);
  const ambiguous = ambiguousSurnames(ours.map((p) => p.name));

  const rows = unmatched.map((p) => {
    const proposal = proposeApiMatch(p, available, { ambiguousSurnames: ambiguous });
    return {
      playerId: p.id,
      ourLabel: `${p.jerseyNumber ?? "·"} · ${p.name}`,
      proposalApiId: proposal?.apiId ?? null,
      proposalHow: proposal?.how ?? null,
    };
  });

  const apiOptions = available
    .slice()
    .sort((a, b) => (a.number ?? 99) - (b.number ?? 99))
    .map((a) => ({ id: a.id, label: `${a.number ?? "·"} · ${a.name}` }));

  // Jugadores de API sin propuesta hacia ninguno (info para el admin).
  const proposedIds = new Set(rows.map((r) => r.proposalApiId).filter(Boolean));
  const apiUnmatched = available
    .filter((a) => !proposedIds.has(a.id))
    .map((a) => `${a.number ?? "·"} · ${a.name}`);

  return { rows, apiOptions, apiUnmatched };
}
