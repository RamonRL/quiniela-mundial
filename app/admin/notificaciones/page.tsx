import { PageHeader } from "@/components/shell/page-header";
import { getTelegramNotificationSettings } from "@/lib/telegram/settings";
import { NotificationsEditor } from "./notifications-editor";

export const metadata = { title: "Notificaciones · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const enabled = await getTelegramNotificationSettings();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Notificaciones de Telegram"
        description="Elige qué eventos te llegan al chat del bot. Lo que desactives deja de notificarse."
      />
      <NotificationsEditor enabled={enabled} />
    </div>
  );
}
