import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Building2, User } from "lucide-react";

/**
 * Tabs Individuales / Departamentos para la página de ranking de una liga
 * empresa. Solo se renderizan si la liga tiene ≥1 departamento creado.
 * No es un toggle reactivo — son dos links a `/ranking` y
 * `/ranking/departamentos`, ambas server components.
 */
export function RankingTabs({ active }: { active: "individual" | "departamentos" }) {
  const t = useTranslations("ranking");
  return (
    <nav className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
      <TabLink href="/ranking" active={active === "individual"}>
        <User className="size-3.5" />
        {t("tabIndividual")}
      </TabLink>
      <TabLink href="/ranking/departamentos" active={active === "departamentos"}>
        <Building2 className="size-3.5" />
        {t("tabDepartments")}
      </TabLink>
    </nav>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] transition ${
        active
          ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      }`}
    >
      {children}
    </Link>
  );
}
