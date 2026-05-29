import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/lib/auth/guards";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const me = await requireUser();
  // Releemos el profile entero por si timezone aún no se incluye en
  // CurrentUser (cambio progresivo). Es una query barata por PK.
  const [row] = await db
    .select({ timezone: profiles.timezone })
    .from(profiles)
    .where(eq(profiles.id, me.id))
    .limit(1);
  const currentTimezone = row?.timezone ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cuenta"
        title="Ajustes"
        description="Apariencia y zona horaria. Los cambios se aplican solo a esta cuenta."
      />
      <SettingsForm currentTimezone={currentTimezone} />
    </div>
  );
}
