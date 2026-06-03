import Link from "next/link";
import { ArrowRight, CalendarPlus, Lock } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchdays, matches } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { DeleteButton } from "@/components/admin/delete-button";
import { formatDateTime } from "@/lib/utils";
import { MatchdayDialog } from "./matchday-dialog";
import { deleteMatchday } from "./actions";

export const metadata = { title: "Calendario · Admin" };
export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<string, string> = {
  group: "Fase de grupos",
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinales",
  third: "Tercer puesto",
  final: "Final",
};

export default async function AdminCalendarioPage() {
  const [days, matchRows] = await Promise.all([
    db.select().from(matchdays).orderBy(asc(matchdays.orderIndex), asc(matchdays.predictionDeadlineAt)),
    db.select().from(matches).orderBy(asc(matches.scheduledAt)),
  ]);

  const countByMatchday = new Map<number, number>();
  for (const m of matchRows) {
    if (m.matchdayId) countByMatchday.set(m.matchdayId, (countByMatchday.get(m.matchdayId) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Calendario"
        description="Jornadas y partidos. El deadline cierra los marcadores."
        actions={<MatchdayDialog />}
      />

      {days.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus className="size-5" />}
          title="Crea tu primera jornada"
          description="Cada jornada con su deadline de predicción."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {days.map((d) => {
            const count = countByMatchday.get(d.id) ?? 0;
            const empty = count === 0;
            const closed = new Date(d.predictionDeadlineAt).getTime() < Date.now();
            return (
              <Card
                key={d.id}
                className={empty ? "border-dashed" : undefined}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] font-display tabular text-xl text-[var(--color-arena)] glow-arena">
                      {d.orderIndex.toString().padStart(2, "0")}
                    </span>
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-[0.6rem] uppercase">
                        {STAGE_LABEL[d.stage] ?? d.stage}
                      </Badge>
                      <CardTitle className="text-base">{d.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 text-xs">
                        {closed ? <Lock className="size-3" /> : null}
                        Cierre: {formatDateTime(d.predictionDeadlineAt)}
                      </CardDescription>
                    </div>
                  </div>
                  <span
                    className={`font-display tabular text-3xl ${
                      empty
                        ? "text-[var(--color-muted-foreground)]/40"
                        : "text-[var(--color-muted-foreground)]"
                    }`}
                  >
                    {count}
                  </span>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2 text-sm">
                  <span
                    className={`font-mono text-[0.6rem] uppercase tracking-[0.18em] ${
                      empty
                        ? "text-[var(--color-warning)]"
                        : "text-[var(--color-muted-foreground)]"
                    }`}
                  >
                    {empty ? "Sin partidos · añade desde gestionar" : `${count} partidos cargados`}
                  </span>
                  <div className="flex items-center gap-1">
                    <DeleteButton
                      action={deleteMatchday}
                      id={d.id}
                      confirmMessage={`¿Eliminar la jornada "${d.name}"? Sus ${count} partidos quedarán sin jornada asignada (no se borran).`}
                    />
                    <Link
                      href={`/admin/calendario/${d.id}`}
                      className="flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                    >
                      Gestionar partidos <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
