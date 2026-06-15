import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { SponsorStrip } from "@/components/dashboard/sponsor-strip";
import { loadLeagueSponsors } from "@/lib/sponsors";
import { SponsorsManager } from "./sponsors-manager";

export const metadata = { title: "Patrocinadores · Admin" };
export const dynamic = "force-dynamic";

export default async function SponsorsAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ leagueId?: string }>;
}) {
  await requireAdmin();
  const params = (await searchParams) ?? {};
  const selectedId = params.leagueId ? Number(params.leagueId) : null;

  const allLeagues = await db
    .select({ id: leagues.id, name: leagues.name, isPublic: leagues.isPublic })
    .from(leagues)
    .orderBy(asc(leagues.name));

  const selected =
    selectedId && Number.isFinite(selectedId)
      ? allLeagues.find((l) => l.id === selectedId) ?? null
      : null;

  const sponsors = selected ? await loadLeagueSponsors(selected.id) : [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Patrocinadores"
        description="Elige una liga y sube los logos de sus patrocinadores. Aparecerán arriba del dashboard de esa liga, sustituyendo al logo de la FIFA World Cup."
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block text-[var(--color-muted-foreground)]">Liga</span>
          <select
            name="leagueId"
            defaultValue={selected?.id ?? ""}
            className="h-10 min-w-[18rem] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
          >
            <option value="" disabled>
              Selecciona una liga…
            </option>
            {allLeagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.isPublic ? " (pública)" : ""} · #{l.id}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">Ver</Button>
      </form>

      {selected ? (
        <div className="space-y-8">
          {/* Vista previa idéntica a la del dashboard */}
          <section className="space-y-2">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              Vista previa — {selected.name}
            </p>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 p-5">
              {sponsors.length > 0 ? (
                <SponsorStrip sponsors={sponsors} />
              ) : (
                <p className="text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                  Sin logos todavía. Esta liga muestra el logo de la FIFA World Cup.
                </p>
              )}
            </div>
          </section>

          <SponsorsManager
            leagueId={selected.id}
            sponsors={sponsors.map((s) => ({
              id: s.id,
              imageUrl: s.imageUrl,
              alt: s.alt,
              linkUrl: s.linkUrl,
            }))}
          />
        </div>
      ) : (
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          Selecciona una liga para gestionar sus patrocinadores.
        </p>
      )}
    </div>
  );
}
