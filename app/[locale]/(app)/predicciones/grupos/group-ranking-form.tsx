"use client";

import { TeamFlag } from "@/components/brand/team-flag";
import { useActionState, useState } from "react";
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
import { GripVertical, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SavePredictionButton } from "@/components/predictions/save-prediction-button";
import { SaveOverlay } from "@/components/predictions/save-overlay";
import { usePredictionSaveToast } from "@/lib/predictions/use-save-toast";
import { saveGroupPredictions, type FormState } from "./actions";

const initial: FormState = { ok: false };

type TeamLite = { id: number; code: string; name: string; flagUrl: string | null };
type GroupInput = {
  id: number;
  code: string;
  name: string;
  teams: TeamLite[];
  initialOrder: number[];
};

export function GroupRankingForm({
  groups,
  open,
}: {
  groups: GroupInput[];
  open: boolean;
}) {
  const [orders, setOrders] = useState<Record<number, number[]>>(
    Object.fromEntries(groups.map((g) => [g.id, g.initialOrder])),
  );
  const [state, action, pending] = useActionState(saveGroupPredictions, initial);

  usePredictionSaveToast(state, {
    successTitle: "Posiciones guardadas",
    successDescription: "Tus 12 grupos quedaron anotados. Puedes editar hasta el cierre.",
  });

  const payload = {
    predictions: groups.map((g) => {
      const order = orders[g.id] ?? g.initialOrder;
      return {
        groupId: g.id,
        pos1TeamId: order[0] ?? null,
        pos2TeamId: order[1] ?? null,
        pos3TeamId: order[2] ?? null,
        pos4TeamId: order[3] ?? null,
      };
    }),
  };

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {!open ? (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
          <Lock className="size-4" />
          La predicción está cerrada.
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            order={orders[g.id]}
            disabled={!open}
            onChange={(newOrder) =>
              setOrders((prev) => ({ ...prev, [g.id]: newOrder }))
            }
          />
        ))}
      </div>
      {open ? (
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-10 flex justify-center rounded-xl border border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-surface)_92%,transparent)] p-2 backdrop-blur-md sm:bottom-3">
          <SavePredictionButton pending={pending} />
        </div>
      ) : null}

      <SaveOverlay open={pending} />
    </form>
  );
}

function GroupCard({
  group,
  order,
  onChange,
  disabled,
}: {
  group: GroupInput;
  order: number[];
  onChange: (order: number[]) => void;
  disabled: boolean;
}) {
  // En PC arranca el drag tras 5px de movimiento (instantáneo). En móvil
  // requiere un long-press de 250ms — así dejamos que el scroll vertical
  // de la página siga funcionando con un toque + arrastre normal.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const teamById = new Map(group.teams.map((t) => [t.id, t]));
  const items = order.map((id) => teamById.get(id)).filter(Boolean) as TeamLite[];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(Number(active.id));
    const newIndex = order.indexOf(Number(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(order, oldIndex, newIndex));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <CardTitle className="text-base">{group.name}</CardTitle>
        <Badge variant="outline" className="text-[0.65rem]">
          {group.code}
        </Badge>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={order.map(String)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {items.map((team, idx) => (
                <SortableRow
                  key={team.id}
                  id={team.id.toString()}
                  team={team}
                  position={idx + 1}
                  disabled={disabled}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}

function SortableRow({
  id,
  team,
  position,
  disabled,
}: {
  id: string;
  team: TeamLite;
  position: number;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  const positionLabel =
    position === 1
      ? "1º"
      : position === 2
        ? "2º"
        : position === 3
          ? "3º"
          : "4º";
  const advances = position <= 2;
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className={`flex select-none items-center gap-2 rounded-md border p-2 ${
        disabled ? "" : "cursor-grab active:cursor-grabbing"
      } ${
        advances
          ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
      }`}
      aria-label={`${team.name}, posición ${positionLabel}. Arrastra para reordenar.`}
      {...attributes}
      {...(disabled ? {} : listeners)}
    >
      <span aria-hidden className="rounded-sm p-1 text-[var(--color-muted-foreground)]">
        <GripVertical className="size-4" />
      </span>
      <span className="grid w-9 text-center font-display text-lg">{positionLabel}</span>
      <TeamFlag code={team.code} size={28} />
      <span className="flex-1 truncate text-sm font-medium">{team.name}</span>
      {advances ? (
        <Badge variant="success" className="text-[0.6rem]">
          Pasa
        </Badge>
      ) : null}
    </li>
  );
}
