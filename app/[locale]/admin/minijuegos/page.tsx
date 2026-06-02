import { PageHeader } from "@/components/shell/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { MINIGAMES } from "@/app/[locale]/(public)/minijuegos/_lib/games";
import { loadGameScores, loadOverview } from "./actions";
import { MinigamesAdminWorkspace } from "./admin-workspace";

export const metadata = { title: "Minijuegos · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMinijuegosPage() {
  await requireAdmin();
  const overview = await loadOverview();
  // Top 25 por juego — suficiente para revisar, ordenar y borrar entradas
  // problemáticas. Si hay que rebuscar más, hay reset por juego completo.
  const topByGame = await Promise.all(
    MINIGAMES.filter((g) => g.status === "live").map(async (g) => ({
      gameKey: g.gameKey,
      rows: await loadGameScores(g.gameKey, 25),
    })),
  );
  const topMap = Object.fromEntries(topByGame.map((t) => [t.gameKey, t.rows]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Minijuegos"
        description="Resumen y gestión de las puntuaciones globales. Borra entradas individuales para limpiar apodos abusivos o resetea un juego entero antes de un evento."
      />
      <MinigamesAdminWorkspace overview={overview} topByGame={topMap} />
    </div>
  );
}
