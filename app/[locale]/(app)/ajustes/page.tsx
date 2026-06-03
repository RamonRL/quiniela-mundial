import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/lib/auth/guards";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
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

      <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="space-y-1">
          <h2 className="font-display text-lg tracking-tight">{t("langTitle")}</h2>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("langDesc")}
          </p>
        </div>
        <LanguageSwitcher />
      </section>
    </div>
  );
}
