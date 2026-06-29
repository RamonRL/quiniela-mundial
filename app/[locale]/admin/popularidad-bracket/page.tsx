import { and, eq, isNotNull, ne, sql, type SQL } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { predBracketSlot, teams } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import { TeamFlag } from "@/components/brand/team-flag";
import { localizeTeams } from "@/lib/team-names";

export const metadata = { title: "Popularidad del bracket · Admin" };
export const dynamic = "force-dynamic";

type Row = {
  id: number;
  code: string;
  name: string;
  r16: number;
  qf: number;
  sf: number;
  finalist: number;
  champion: number;
};

// Columnas = la ronda a la que la gente ve LLEGAR a la selección.
const COLS: { key: keyof Pick<Row, "r16" | "qf" | "sf" | "finalist" | "champion">; label: string }[] = [
  { key: "r16", label: "Octavos" },
  { key: "qf", label: "Cuartos" },
  { key: "sf", label: "Semis" },
  { key: "finalist", label: "Final" },
  { key: "champion", label: "Campeón" },
];

export default async function PopularidadBracketPage() {
  await requireAdmin();
  const locale = await getLocale();

  // Usuarios distintos que ponen a cada selección llegando a cada ronda. Una
  // pick por (usuario, ronda) — set-membership, igual que el scorer.
  const distinctUsers = sql<number>`count(distinct ${predBracketSlot.userId})::int`;
  const byTeam = (where: SQL) =>
    db
      .select({ teamId: predBracketSlot.predictedTeamId, u: distinctUsers })
      .from(predBracketSlot)
      .where(where)
      .groupBy(predBracketSlot.predictedTeamId);

  const [r16, qf, sf, finalist, champion, totalRow] = await Promise.all([
    byTeam(and(eq(predBracketSlot.stage, "r16"), isNotNull(predBracketSlot.predictedTeamId))!),
    byTeam(and(eq(predBracketSlot.stage, "qf"), isNotNull(predBracketSlot.predictedTeamId))!),
    byTeam(and(eq(predBracketSlot.stage, "sf"), isNotNull(predBracketSlot.predictedTeamId))!),
    byTeam(
      and(
        eq(predBracketSlot.stage, "final"),
        ne(predBracketSlot.slotPosition, 0),
        isNotNull(predBracketSlot.predictedTeamId),
      )!,
    ),
    byTeam(
      and(
        eq(predBracketSlot.stage, "final"),
        eq(predBracketSlot.slotPosition, 0),
        isNotNull(predBracketSlot.predictedTeamId),
      )!,
    ),
    db
      .select({ u: distinctUsers })
      .from(predBracketSlot)
      .where(isNotNull(predBracketSlot.predictedTeamId)),
  ]);

  const totalPredictors = totalRow[0]?.u ?? 0;

  const allTeams = localizeTeams(await db.select().from(teams), locale);
  const m = (rows: { teamId: number | null; u: number }[]) =>
    new Map(rows.filter((r) => r.teamId != null).map((r) => [r.teamId as number, r.u]));
  const mr16 = m(r16);
  const mqf = m(qf);
  const msf = m(sf);
  const mfin = m(finalist);
  const mch = m(champion);

  const rows: Row[] = allTeams
    .map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      r16: mr16.get(t.id) ?? 0,
      qf: mqf.get(t.id) ?? 0,
      sf: msf.get(t.id) ?? 0,
      finalist: mfin.get(t.id) ?? 0,
      champion: mch.get(t.id) ?? 0,
    }))
    .filter((r) => r.r16 + r.qf + r.sf + r.finalist + r.champion > 0)
    // Favoritas arriba: campeón → finalista → semis → cuartos → octavos.
    .sort(
      (a, b) =>
        b.champion - a.champion ||
        b.finalist - a.finalist ||
        b.sf - a.sf ||
        b.qf - a.qf ||
        b.r16 - a.r16,
    );

  const maxByCol: Record<string, number> = {};
  for (const c of COLS) maxByCol[c.key] = Math.max(1, ...rows.map((r) => r[c.key]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Popularidad del bracket"
        description={`Cuántos usuarios ven a cada selección llegar a cada ronda en sus brackets (todas las quinielas modo Completo, usuarios distintos). ${totalPredictors} personas han rellenado bracket.`}
      />

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60">
              <th className="px-3 py-2.5 text-left font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                Selección
              </th>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className="px-3 py-2.5 text-right font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-[var(--color-border)] last:border-0 transition-colors hover:bg-[var(--color-surface-2)]/40"
              >
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <TeamFlag code={r.code} size={20} />
                    <span className="font-display tracking-tight">{r.name}</span>
                  </span>
                </td>
                {COLS.map((c) => {
                  const v = r[c.key];
                  const pct = v / maxByCol[c.key];
                  return (
                    <td key={c.key} className="px-3 py-2 text-right tabular">
                      <span
                        className={
                          v === 0
                            ? "text-[var(--color-muted-foreground)]/50"
                            : pct >= 0.66
                              ? "font-semibold text-[var(--color-arena)]"
                              : "text-[var(--color-foreground)]"
                        }
                      >
                        {v}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLS.length + 1} className="px-3 py-10 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                  Aún no hay predicciones de bracket.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
