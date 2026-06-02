import { PageHeader } from "@/components/shell/page-header";
import { MonitoringTabs } from "./tabs";

export const metadata = { title: "Monitoreo · Admin" };

export default function MonitoringLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Centro de control"
        title="Monitoreo"
        description="Salud de la web, actividad de la peña y auditoría — todo a un vistazo."
      />
      <MonitoringTabs
        items={[
          { href: "/admin/monitoreo", label: "Overview", icon: "activity" },
          { href: "/admin/monitoreo/geo", label: "Geo", icon: "globe" },
          { href: "/admin/monitoreo/producto", label: "Producto", icon: "lightbulb" },
          { href: "/admin/monitoreo/sistema", label: "Sistema", icon: "server" },
          { href: "/admin/monitoreo/auditoria", label: "Auditoría", icon: "scroll" },
        ]}
      />
      {children}
    </div>
  );
}
