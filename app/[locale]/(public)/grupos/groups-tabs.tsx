import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

/** Pestañas de la sección Grupos: tabla de grupos ↔ mejores terceros. */
export async function GroupsTabs({ active }: { active: "grupos" | "terceros" }) {
  const t = await getTranslations("groupsPage");
  const tabs: { key: "grupos" | "terceros"; href: string; label: string }[] = [
    { key: "grupos", href: "/grupos", label: t("tabGroups") },
    { key: "terceros", href: "/grupos/terceros", label: t("tabThirds") },
  ];
  return (
    <nav className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex-1 rounded-lg px-4 py-2 text-center font-mono text-[0.7rem] uppercase tracking-[0.18em] transition-colors ${
              isActive
                ? "bg-[var(--color-arena)] text-[var(--color-arena-foreground,#000)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
