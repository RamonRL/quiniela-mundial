import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { scoringRules } from "@/lib/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { RulesEditor } from "./rules-editor";

export const metadata = { title: "Reglas · Admin" };

export default async function AdminRulesPage() {
  const rows = await db.select().from(scoringRules).orderBy(asc(scoringRules.key));
  const rules = rows.map((r) => {
    const v = r.valueJson as { points?: number } | null;
    return {
      key: r.key,
      points: typeof v?.points === "number" ? v.points : 0,
      description: r.description ?? r.key,
    };
  });
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Reglas de puntuación"
        description="Cada cambio recalcula todos los puntos."
      />
      <RulesEditor rules={rules} />
    </div>
  );
}
