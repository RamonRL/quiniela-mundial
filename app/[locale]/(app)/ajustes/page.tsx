import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("settings");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("pageEyebrow")}
        title={t("pageTitle")}
        description={t("pageDesc")}
      />
      <SettingsForm currentTimezone={currentTimezone} />
    </div>
  );
}
