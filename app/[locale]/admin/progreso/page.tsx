import { asc, eq, sql } from "drizzle-orm";
import {
  Activity,
  CheckCircle2,
  Clock,
  Goal,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  groups,
  matchdays,
  matches,
  specialPredictions,
} from "@/lib/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Progreso · Admin" };
export const dynamic = "force-dynamic";

type Status = "done" | "partial" | "pending";

export default async function AdminProgresoPage() {
  // ─── Fase de grupos: 6 partidos por grupo. "Done" cuando los 6 están
  //     finalizados (= scoring cat 1 ya disparado por el orquestador).
  const groupRowsRaw = await db
    .select({
      id: groups.id,
      code: groups.code,
      name: groups.name,
    })
    .from(groups)
    .orderBy(asc(groups.code));

  const groupMatchStats = await db
    .select({
      groupId: matches.groupId,
      total: sql<number>`count(*)::int`,
      finished: sql<number>`count(*) filter (where status = 'finished')::int`,
    })
    .from(matches)
    .where(eq(matches.stage, "group"))
    .groupBy(matches.groupId);

  const groupStatById = new Map<number, { total: number; finished: number }>();
  for (const r of groupMatchStats) {
    if (r.groupId == null) continue;
    groupStatById.set(r.groupId, { total: r.total, finished: r.finished });
  }

  const groupItems = groupRowsRaw.map((g) => {
    const s = groupStatById.get(g.id) ?? { total: 0, finished: 0 };
    const status: Status =
      s.total > 0 && s.finished === s.total
        ? "done"
        : s.finished > 0
          ? "partial"
          : "pending";
    return {
      label: g.name,
      sub: `${s.finished}/${s.total || 6} partidos`,
      code: g.code,
      status,
    };
  });

  // ─── Bracket: por stage. Key se otorga cuando todos los partidos del
  //     stage SOURCE están finalizados (orquestador ejecuta recompute incremental).
  type StageMap = { src: typeof matches.$inferSelect.stage; key: string; label: string };
  const bracketStages: StageMap[] = [
    { src: "r32", key: "r16", label: "R16 (cierra R32)" },
    { src: "r16", key: "qf", label: "QF (cierra R16)" },
    { src: "qf", key: "sf", label: "SF (cierra QF)" },
    { src: "sf", key: "final", label: "Final (cierra SF)" },
    { src: "final", key: "champion", label: "Campeón (cierra final)" },
  ];

  const allKoStats = await db
    .select({
      stage: matches.stage,
      total: sql<number>`count(*)::int`,
      finished: sql<number>`count(*) filter (where status = 'finished')::int`,
    })
    .from(matches)
    .groupBy(matches.stage);
  const koStatByStage = new Map<string, { total: number; finished: number }>();
  for (const r of allKoStats) {
    koStatByStage.set(r.stage, { total: r.total, finished: r.finished });
  }

  const bracketItems = bracketStages.map((s) => {
    const stat = koStatByStage.get(s.src) ?? { total: 0, finished: 0 };
    const status: Status =
      stat.total > 0 && stat.finished === stat.total
        ? "done"
        : stat.finished > 0
          ? "partial"
          : "pending";
    return {
      label: s.label,
      sub: `${stat.finished}/${stat.total || "?"} partidos finalizados`,
      status,
    };
  });

  // ─── Bota de oro: la final finalizada → orquestador la calcula.
  const finalStat = koStatByStage.get("final") ?? { total: 0, finished: 0 };
  const topScorerStatus: Status =
    finalStat.total > 0 && finalStat.finished === finalStat.total ? "done" : "pending";

  // ─── Jornadas: cat 4 + cat 5 (resultado + goleador por partido). Done
  //     cuando todos los partidos de la jornada están finalizados.
  const matchdayList = await db
    .select({
      id: matchdays.id,
      name: matchdays.name,
      stage: matchdays.stage,
      orderIndex: matchdays.orderIndex,
    })
    .from(matchdays)
    .orderBy(asc(matchdays.orderIndex), asc(matchdays.id));

  const matchdayStats = await db
    .select({
      matchdayId: matches.matchdayId,
      total: sql<number>`count(*)::int`,
      finished: sql<number>`count(*) filter (where status = 'finished')::int`,
    })
    .from(matches)
    .groupBy(matches.matchdayId);
  const mdStatById = new Map<number, { total: number; finished: number }>();
  for (const r of matchdayStats) {
    if (r.matchdayId == null) continue;
    mdStatById.set(r.matchdayId, { total: r.total, finished: r.finished });
  }

  const matchdayItems = matchdayList.map((m) => {
    const s = mdStatById.get(m.id) ?? { total: 0, finished: 0 };
    const status: Status =
      s.total > 0 && s.finished === s.total
        ? "done"
        : s.finished > 0
          ? "partial"
          : "pending";
    return {
      label: m.name,
      sub: `${s.finished}/${s.total || "?"} partidos`,
      tag: m.stage.toUpperCase(),
      status,
    };
  });

  // ─── Especiales: resoluble por resolvedValueJson != null.
  const specials = await db
    .select({
      id: specialPredictions.id,
      key: specialPredictions.key,
      question: specialPredictions.question,
      resolvedValueJson: specialPredictions.resolvedValueJson,
      resolvedAt: specialPredictions.resolvedAt,
    })
    .from(specialPredictions)
    .orderBy(asc(specialPredictions.orderIndex), asc(specialPredictions.id));

  const specialItems = specials.map((s) => {
    const resolved = s.resolvedValueJson != null;
    const isManual = s.key === "best_goalkeeper" || s.key === "best_player";
    return {
      label: s.question,
      sub: resolved ? "Resuelto" : isManual ? "Manual (lo resuelves tú)" : "Auto · pendiente",
      status: (resolved ? "done" : "pending") as Status,
      tag: isManual ? "Manual" : "Auto",
    };
  });

  // KPI overall counters
  const kpis = [
    { label: "Grupos puntuados", value: groupItems.filter((i) => i.status === "done").length, total: groupItems.length },
    { label: "Stages bracket", value: bracketItems.filter((i) => i.status === "done").length, total: bracketItems.length },
    { label: "Jornadas resueltas", value: matchdayItems.filter((i) => i.status === "done").length, total: matchdayItems.length },
    { label: "Especiales", value: specialItems.filter((i) => i.status === "done").length, total: specialItems.length },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Progreso de puntuaciones"
        description="Vista rápida de qué bloques de scoring ya se han repartido. ✓ = otorgado · ◔ = parcial · ✗ = pendiente."
      />

      {/* KPI strip */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {k.label}
            </p>
            <p className="mt-1 font-display tabular text-3xl tracking-tight text-[var(--color-arena)] glow-arena">
              {k.value}
              <span className="ml-1 text-base text-[var(--color-muted-foreground)]">
                / {k.total}
              </span>
            </p>
          </div>
        ))}
      </section>

      <ProgressBox
        icon={<Users className="size-4" />}
        title="Categoría 1 · Posiciones por grupo"
        description="3 puntos por posición exacta · 1 por adyacente · +1 swap top-2. Se reparte cuando termina el último partido del grupo."
        items={groupItems}
        cols="md:grid-cols-3 lg:grid-cols-4"
      />

      <ProgressBox
        icon={<Swords className="size-4" />}
        title="Categoría 2 · Bracket eliminatorio"
        description="2 / 4 / 7 / 10 / 20 puntos por etapa. Se reparte incrementalmente cada vez que termina un KO match."
        items={bracketItems}
        cols="md:grid-cols-2 lg:grid-cols-3"
      />

      <ProgressBox
        icon={<Trophy className="size-4" />}
        title="Categoría 3 · Bota de Oro"
        description="15 / 5 / 2 puntos según queda tu predicción del máximo goleador. Se calcula al finalizar la final (excluye en propia)."
        items={[
          {
            label: "Ranking final del torneo",
            sub:
              topScorerStatus === "done"
                ? "Calculada y repartida"
                : "Pendiente — espera a la final",
            status: topScorerStatus,
          },
        ]}
        cols="md:grid-cols-2"
      />

      <ProgressBox
        icon={<Goal className="size-4" />}
        title="Categorías 4+5 · Jornadas (resultado y goleador)"
        description="Marcadores y goleadores por partido. Los puntos se reparten a medida que el admin guarda cada resultado."
        items={matchdayItems}
        cols="md:grid-cols-2 lg:grid-cols-3"
      />

      <ProgressBox
        icon={<Sparkles className="size-4" />}
        title="Categoría 6 · Predicciones especiales"
        description="Las marcadas como Auto se resuelven solas al cumplirse su condición. Las Manual las resuelves desde /admin/especiales."
        items={specialItems}
        cols="md:grid-cols-2"
      />
    </div>
  );
}

function ProgressBox({
  icon,
  title,
  description,
  items,
  cols,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: { label: string; sub?: string; tag?: string; code?: string; status: Status }[];
  cols?: string;
}) {
  const doneCount = items.filter((i) => i.status === "done").length;
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-9 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-arena)]">
            {icon}
          </span>
          <div>
            <h2 className="font-display text-xl tracking-tight">{title}</h2>
            <p className="mt-0.5 max-w-2xl font-editorial text-xs italic leading-relaxed text-[var(--color-muted-foreground)]">
              {description}
            </p>
          </div>
        </div>
        <Badge variant={doneCount === items.length ? "success" : "outline"}>
          {doneCount} / {items.length}
        </Badge>
      </header>
      <div className={cn("grid gap-2", cols ?? "md:grid-cols-2")}>
        {items.map((it, i) => (
          <ProgressItem key={i} item={it} />
        ))}
      </div>
    </section>
  );
}

function ProgressItem({
  item,
}: {
  item: { label: string; sub?: string; tag?: string; code?: string; status: Status };
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-[var(--color-surface-2)] px-3 py-2.5",
        item.status === "done"
          ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5"
          : item.status === "partial"
            ? "border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5"
            : "border-[var(--color-border)]",
      )}
    >
      <StatusIcon status={item.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {item.code ? (
            <span className="font-display text-sm tracking-tight text-[var(--color-arena)]">
              {item.code}
            </span>
          ) : null}
          <p className="truncate text-sm font-medium">{item.label}</p>
        </div>
        {item.sub ? (
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {item.sub}
          </p>
        ) : null}
      </div>
      {item.tag ? (
        <Badge variant="outline" className="text-[0.55rem]">
          {item.tag}
        </Badge>
      ) : null}
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "done") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
        <CheckCircle2 className="size-4" />
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)]">
        <Clock className="size-4" />
      </span>
    );
  }
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-dashed border-[var(--color-border-strong)] text-[var(--color-muted-foreground)]">
      <Activity className="size-3.5" />
    </span>
  );
}

