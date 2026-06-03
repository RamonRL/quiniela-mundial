import { PageHeader } from "@/components/shell/page-header";
import { isGroupStageComplete } from "@/lib/automation/bracket-population";
import { OperationsActions } from "./operations-actions";

export const metadata = { title: "Operaciones · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOperationsPage() {
  const groupsDone = await isGroupStageComplete();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Operaciones del torneo"
        description="Casi todo es automático: el sistema reparte puntos y abre predicciones a medida que terminan partidos. Aquí solo ubicas las mejores terceras y, si hace falta, fuerzas un recálculo."
      />
      <OperationsActions groupsDone={groupsDone} />
    </div>
  );
}
