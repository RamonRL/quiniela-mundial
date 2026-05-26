"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TeamFlag } from "@/components/brand/team-flag";
import { PointsHint } from "@/components/predictions/points-hint";
import {
  InteractiveTourShell,
  flashSavedToast,
} from "@/components/predictions/interactive-tour-shell";
import {
  endGroupsTour,
  saveGroupPredictionForGroup,
} from "./actions";

type TeamLite = { id: number; code: string; name: string };
type GroupItem = {
  id: number;
  code: string;
  name: string;
  teams: TeamLite[];
  initialOrder: number[];
};

export function GroupsTourClient({
  items,
  initialStep,
  allCompleteOnEntry,
}: {
  items: GroupItem[];
  initialStep: number;
  allCompleteOnEntry: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [orders, setOrders] = useState<Record<number, number[]>>(
    Object.fromEntries(items.map((g) => [g.id, g.initialOrder])),
  );
  const [pending, startTransition] = useTransition();
  const toldEntryToast = useRef(false);

  // Toast inicial si entra con todos los grupos ya predichos.
  useEffect(() => {
    if (toldEntryToast.current) return;
    toldEntryToast.current = true;
    if (allCompleteOnEntry) {
      toast("Ya predijiste los 12 grupos.", {
        description: "Revisa o cierra cuando quieras. Auto-guardado al pasar.",
      });
    }
  }, [allCompleteOnEntry]);

  // URL ↔ step: refrescar el ?step= sin recargar.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("step") !== String(step)) {
      url.searchParams.set("step", String(step));
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [step, router]);

  const current = items[step];
  if (!current) return null;
  const currentOrder = orders[current.id];

  async function persistCurrent(): Promise<boolean> {
    const order = orders[current.id];
    if (!order || order.length !== 4) return false;
    const res = await saveGroupPredictionForGroup({
      groupId: current.id,
      pos1TeamId: order[0],
      pos2TeamId: order[1],
      pos3TeamId: order[2],
      pos4TeamId: order[3],
    });
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo guardar.");
      return false;
    }
    flashSavedToast();
    return true;
  }

  function onPrev() {
    if (step === 0) return;
    startTransition(async () => {
      const ok = await persistCurrent();
      if (!ok) return;
      setDirection("left");
      setStep((s) => s - 1);
    });
  }

  function onNext() {
    const isLast = step === items.length - 1;
    startTransition(async () => {
      const ok = await persistCurrent();
      if (!ok) return;
      if (isLast) {
        await endGroupsTour();
        router.push("/predicciones");
        return;
      }
      setDirection("right");
      setStep((s) => s + 1);
    });
  }

  return (
    <InteractiveTourShell
      title="Posiciones por grupo"
      currentStep={step}
      totalSteps={items.length}
      onPrev={onPrev}
      onNext={onNext}
      direction={direction}
      finishLabel="Finalizar"
      pending={pending}
    >
      <GroupStep
        group={current}
        order={currentOrder}
        onChange={(next) =>
          setOrders((prev) => ({ ...prev, [current.id]: next }))
        }
      />
    </InteractiveTourShell>
  );
}

function GroupStep({
  group,
  order,
  onChange,
}: {
  group: GroupItem;
  order: number[];
  onChange: (order: number[]) => void;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const teamById = new Map(group.teams.map((t) => [t.id, t]));
  const items = order.map((id) => teamById.get(id)).filter(Boolean) as TeamLite[];

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(Number(active.id));
    const newIdx = order.indexOf(Number(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    onChange(arrayMove(order, oldIdx, newIdx));
  }

  return (
    <div className="space-y-6">
      <header className="text-center">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
          Grupo {group.code}
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
          Ordena del 1º al 4º
        </h1>
        <p className="mt-2 font-editorial text-sm italic leading-snug text-[var(--color-muted-foreground)]">
          Arrastra cada selección a su posición. Los dos primeros pasan a la fase eliminatoria.
        </p>
      </header>

      <PointsHint
        items={[
          { points: 3, label: "Por cada selección en su posición exacta" },
          { points: 1, label: "Por cada selección a ±1 posición" },
          { points: 1, prefix: "+", label: "Bonus si aciertas top-2 aunque cambies su orden", bonus: true },
        ]}
        footnote="Máximo 13 pts en este grupo."
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order.map(String)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3">
            {items.map((team, idx) => (
              <SortableRow key={team.id} id={team.id.toString()} team={team} position={idx + 1} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({
  id,
  team,
  position,
}: {
  id: string;
  team: TeamLite;
  position: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const advances = position <= 2;
  const positionLabel = position === 1 ? "1º" : position === 2 ? "2º" : position === 3 ? "3º" : "4º";
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className={`flex select-none cursor-grab items-center gap-3 rounded-lg border p-4 active:cursor-grabbing ${
        advances
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
      }`}
      aria-label={`${team.name}, posición ${positionLabel}. Arrastra para reordenar.`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4 text-[var(--color-muted-foreground)]" />
      <span className="font-display text-2xl tabular w-10 text-center">{positionLabel}</span>
      <TeamFlag code={team.code} size={36} />
      <span className="flex-1 truncate text-base font-medium">{team.name}</span>
      {advances ? (
        <Badge variant="default" className="gap-1 text-[0.6rem]">
          <Trophy className="size-3" />
          Pasa
        </Badge>
      ) : null}
    </li>
  );
}
