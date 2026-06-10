import { asc, eq, gt } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { groups, matches, teams } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { localizeTeams } from "@/lib/team-names";
import { getDateContext } from "@/lib/timezone-server";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { NextMatchCountdown } from "@/components/dashboard/next-match-countdown";

export const metadata = { title: "Preview · Admin" };
export const dynamic = "force-dynamic";

/**
 * Vitrina de cosas EN PRUEBAS, visible solo para admins (requireAdmin). El
 * resto de usuarios sigue viendo el dashboard normal. Cada sección es una
 * maqueta de algo que aún no está activo para todos; se itera aquí antes de
 * sacarlo a producción. Hoy: el hero del dashboard con cuenta atrás al próximo
 * partido (sustituirá al "Faltan 02 días" cuando el torneo empiece).
 */
export default async function PreviewPage() {
  await requireAdmin();
  const locale = await getLocale();
  const { timeZone } = await getDateContext();

  const [next] = await db
    .select()
    .from(matches)
    .where(gt(matches.scheduledAt, new Date()))
    .orderBy(asc(matches.scheduledAt))
    .limit(1);

  let home = null as { code: string; name: string } | null;
  let away = null as { code: string; name: string } | null;
  let groupCode: string | null = null;
  let dateLabel = "";
  if (next) {
    const teamRows = await db.select().from(teams);
    const byId = new Map(localizeTeams(teamRows, locale).map((t) => [t.id, t]));
    home = next.homeTeamId ? byId.get(next.homeTeamId) ?? null : null;
    away = next.awayTeamId ? byId.get(next.awayTeamId) ?? null : null;
    if (next.groupId) {
      const [g] = await db
        .select({ code: groups.code })
        .from(groups)
        .where(eq(groups.id, next.groupId))
        .limit(1);
      groupCode = g?.code ?? null;
    }
    dateLabel = formatDateTime(next.scheduledAt, {
      timeZone,
      locale,
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const labels = {
    eyebrow: "Próximo partido",
    live: "¡En juego!",
    units: { d: "días", h: "horas", m: "min", s: "seg" },
    group: "Grupo",
    predDone: "Ya tienes pronóstico · editable hasta el inicio",
    predDoneCta: "Editar",
    predMissing: "Aún no has puesto tu pronóstico de este partido",
    predMissingHint: "Puedes hacerlo hasta que empiece",
    predMissingCta: "Predecir",
  };
  // Deep-link directo a ESE partido en el paso a paso (?match=<id>). El tour
  // resuelve el paso por id; si la jornada ya no está abierta, el propio tour
  // redirige a la lista. Fallback a /predicciones si falta el dato.
  const href = next?.matchdayId
    ? `/predicciones/jornada/${next.matchdayId}/tour?match=${next.id}`
    : "/predicciones";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Preview"
        description="Maquetas en pruebas, visibles solo para ti. El resto de usuarios sigue viendo el dashboard normal."
      />

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl tracking-tight">
            Dashboard · hero con cuenta atrás al próximo partido (opción 2)
          </h2>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Así se vería el bloque grande del dashboard cuando el torneo ya haya empezado,
            en lugar de “Faltan 02 días al inicio”. La cuenta atrás corre en vivo. Abajo, las
            dos versiones según el usuario ya tenga pronóstico de ese partido o no.
          </p>
        </div>

        {next ? (
          <div className="space-y-6">
            {([
              { tag: "Versión A · usuario CON pronóstico", hasResult: true },
              { tag: "Versión B · usuario SIN pronóstico (aviso)", hasResult: false },
            ] as const).map((variant) => (
              <div key={variant.tag} className="space-y-2">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                  {variant.tag}
                </p>
                <div className="rise-in relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <div className="spotlight absolute inset-0" aria-hidden />
                  <div className="pitch-grid absolute inset-0 opacity-30" aria-hidden />
                  <div className="relative p-6 sm:p-10">
                    <NextMatchCountdown
                      kickoffISO={new Date(next.scheduledAt).toISOString()}
                      matchCode={next.code}
                      home={home}
                      away={away}
                      group={groupCode}
                      dateLabel={dateLabel}
                      prediction={{ hasResult: variant.hasResult, href }}
                      labels={labels}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            No hay ningún partido futuro en el calendario para previsualizar la cuenta atrás.
          </p>
        )}
      </section>
    </div>
  );
}
