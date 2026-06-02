import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { specialPredictions } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { formatDateTime } from "@/lib/utils";
import { ResolveSpecialForm } from "./resolve-form";
import { NewSpecialButton } from "./special-form";
import { EditSpecialButton } from "./edit-button";
import { deleteSpecial } from "./actions";

export const metadata = { title: "Especiales · Admin" };

export default async function AdminSpecialsPage() {
  const specials = await db
    .select()
    .from(specialPredictions)
    .orderBy(asc(specialPredictions.orderIndex));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Predicciones especiales"
        description="Preguntas extra de la quiniela."
        actions={<NewSpecialButton />}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        {specials.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <Badge variant="outline" className="text-[0.65rem] uppercase">
                    {s.type.replace(/_/g, " ")}
                  </Badge>
                  <CardTitle className="text-base">{s.question}</CardTitle>
                  <CardDescription>
                    Cierra: {formatDateTime(s.closesAt)}
                    <span className="ml-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {s.key}
                    </span>
                  </CardDescription>
                </div>
                {s.resolvedValueJson ? (
                  <Badge variant="success" className="text-[0.65rem]">
                    Resuelto
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[0.65rem]">
                    Pendiente
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ResolveSpecialForm
                special={{
                  id: s.id,
                  type: s.type,
                  optionsJson: s.optionsJson as unknown,
                  resolvedValueJson: s.resolvedValueJson as unknown,
                }}
              />
              <div className="flex items-center justify-end gap-1 border-t border-dashed border-[var(--color-border)] pt-3">
                <EditSpecialButton
                  special={{
                    id: s.id,
                    key: s.key,
                    question: s.question,
                    type: s.type,
                    optionsJson: s.optionsJson as unknown,
                    pointsConfigJson: s.pointsConfigJson as unknown,
                    closesAt: s.closesAt.toISOString(),
                  }}
                />
                <DeleteButton
                  action={deleteSpecial}
                  id={s.id}
                  confirmMessage={`¿Eliminar "${s.question}"? Se borran también las predicciones que los participantes hayan hecho.`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
