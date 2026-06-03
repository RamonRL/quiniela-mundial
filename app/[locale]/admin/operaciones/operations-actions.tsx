"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  ArrowRight,
  CalculatorIcon,
  Loader2,
  Play,
  RotateCcw,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  recomputeBracket,
  recomputeEverything,
  recomputeGroups,
  recomputeMatches,
  recomputeSpecials,
  recomputeTopScorer,
  resetAllPoints,
  resetGroupStage,
  type FormState,
} from "./actions";

export function OperationsActions({ groupsDone }: { groupsDone: boolean }) {
  const [pending, start] = useTransition();

  function run(fn: () => Promise<FormState>, label: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? `${label} ejecutada.`);
      else toast.error(res.error ?? "Error.");
    });
  }

  return (
    <div className="space-y-6">
      {/* ─── Acción manual: ubicar mejores terceros ─── */}
      <Card
        className={
          groupsDone
            ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))]"
            : undefined
        }
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-[var(--color-arena)]" />
            Ubicar mejores terceros
          </CardTitle>
          <CardDescription>
            En cuanto cierre la fase de grupos, asigna las 8 mejores terceras a los
            slots de R32 que las esperan. Es la única operación manual del bracket —
            con el resto se encarga el sistema. En cuanto guardes, se desbloquea la
            predicción del bracket completo y la jornada R32.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-wrap items-center gap-2">
          <Button asChild disabled={!groupsDone}>
            <Link
              href="/admin/operaciones/mejores-terceros"
              aria-disabled={!groupsDone}
              className={!groupsDone ? "pointer-events-none opacity-60" : undefined}
            >
              {groupsDone ? "Asignar terceros" : "Disponible al cerrar grupos"}
              <ArrowRight />
            </Link>
          </Button>
        </CardFooter>
      </Card>

      {/* ─── Recalcular por sección ─── */}
      <section>
        <header className="mb-3 flex items-center gap-2">
          <CalculatorIcon className="size-4 text-[var(--color-muted-foreground)]" />
          <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Recalcular puntos
          </h2>
        </header>
        <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">
          Por defecto los puntos se reparten solos al guardar resultados. Estos botones
          son por si algo se ha desincronizado y hay que forzar un recálculo. Todos son
          idempotentes.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          <RecomputeCard
            title="Recalcular partidos"
            description="Re-aplica el scoring (cat 4 marcadores + cat 5 goleadores por partido) sobre todos los partidos finalizados."
            onClick={() => run(recomputeMatches, "Recompute partidos")}
            pending={pending}
          />
          <RecomputeCard
            title="Recalcular grupos"
            description="Recompone group_standings desde los partidos y otorga la cat 1 (posiciones por grupo)."
            onClick={() => run(recomputeGroups, "Recompute grupos")}
            pending={pending}
          />
          <RecomputeCard
            title="Recalcular bracket"
            description="Recompute incremental de la cat 2 para cada ronda KO con partidos finalizados."
            onClick={() => run(recomputeBracket, "Recompute bracket")}
            pending={pending}
          />
          <RecomputeCard
            title="Recalcular bota de oro"
            description="Re-deriva el ranking de goleadores (excluye en propia) y reparte cat 3."
            onClick={() => run(recomputeTopScorer, "Recompute bota de oro")}
            pending={pending}
          />
          <RecomputeCard
            title="Recalcular especiales"
            description="Re-evalúa las reglas auto (totales de grupos, África en semis, anfitrión más lejano…) y recompute todos los specials. Los manuales (Guante / Balón) no se tocan."
            onClick={() => run(recomputeSpecials, "Recompute especiales")}
            pending={pending}
          />
          <RecomputeCard
            title="Recalcular todo"
            description="Versión nuclear. Reaplica todas las funciones de puntuación sobre el estado actual del torneo."
            onClick={() => run(recomputeEverything, "Recompute todo")}
            pending={pending}
            variant="primary"
          />
        </div>
      </section>

      {/* ─── Resets destructivos ─── */}
      <section>
        <header className="mb-3 flex items-center gap-2">
          <RotateCcw className="size-4 text-[var(--color-danger)]" />
          <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-danger)]">
            Resets destructivos
          </h2>
        </header>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="border-[var(--color-danger)]/40 bg-[color-mix(in_oklch,var(--color-danger)_3%,var(--color-surface))]">
            <CardHeader>
              <CardTitle className="text-[var(--color-danger)]">
                Resetear fase de grupos
              </CardTitle>
              <CardDescription>
                Vacía la tabla de clasificación y borra del ledger los puntos de cat 1.
                El resto del ledger queda intacto. La clasificación se regenera al
                guardar cualquier resultado de grupos o con &ldquo;Recalcular grupos&rdquo;.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                variant="outline"
                className="border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:border-[var(--color-danger)] hover:bg-[color-mix(in_oklch,var(--color-danger)_8%,transparent)] hover:text-[var(--color-danger)]"
                onClick={() =>
                  run(
                    resetGroupStage,
                    "Reset fase grupos",
                    "Vas a borrar la clasificación calculada y los puntos de \"Posiciones de grupo\". ¿Continuar?",
                  )
                }
                disabled={pending}
              >
                {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                Resetear fase grupos
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-[var(--color-danger)]/40 bg-[color-mix(in_oklch,var(--color-danger)_3%,var(--color-surface))]">
            <CardHeader>
              <CardTitle className="text-[var(--color-danger)]">
                Resetear puntuaciones
              </CardTitle>
              <CardDescription>
                Pone TODAS las puntuaciones a cero borrando el `points_ledger`. Las
                predicciones se mantienen — sólo se borran los puntos. Útil para
                arrancar limpio antes de un torneo de prueba.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                variant="outline"
                className="border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:border-[var(--color-danger)] hover:bg-[color-mix(in_oklch,var(--color-danger)_8%,transparent)] hover:text-[var(--color-danger)]"
                onClick={() =>
                  run(
                    resetAllPoints,
                    "Reset puntuaciones",
                    "Vas a poner TODAS las puntuaciones a cero. ¿Seguro?",
                  )
                }
                disabled={pending}
              >
                {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                Resetear a cero
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  );
}

function RecomputeCard({
  title,
  description,
  onClick,
  pending,
  variant = "default",
}: {
  title: string;
  description: string;
  onClick: () => void;
  pending: boolean;
  variant?: "default" | "primary";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent />
      <CardFooter>
        <Button
          variant={variant === "primary" ? "default" : "secondary"}
          onClick={onClick}
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Play />}
          Recalcular
        </Button>
      </CardFooter>
    </Card>
  );
}
