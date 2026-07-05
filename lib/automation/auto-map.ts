import { mapFixtures } from "@/lib/sports/fixture-mapping";
import { sendTelegramMessage, escapeHTML } from "@/lib/telegram/notify";

/**
 * Auto-mapea el `provider_fixture_id` de los partidos que ya tienen ambos
 * equipos definidos pero aún no están mapeados. Se llama desde el orquestador
 * cuando una ronda se puebla (grupos→R32 por cierre de grupo, o cascada KO):
 * en ese momento los partidos de la ronda siguiente ya tienen equipos, así que
 * el sync en vivo podrá recogerlos SIN intervención manual.
 *
 * Es NO-FATAL por diseño: el scoring y la cascada no deben depender de la API
 * externa. Si falta la key o la API falla, se registra/avisa y se sigue.
 */
export async function autoMapNewFixtures(): Promise<void> {
  if (!process.env.API_FOOTBALL_KEY) return; // sin key (p. ej. tests/local): no-op
  try {
    const r = await mapFixtures({ apply: true, onlyUnmapped: true });
    if (r.applied > 0) {
      await sendTelegramMessage(
        `🔗 <b>Fixtures auto-mapeados</b>\nSe enlazaron ${r.applied} partido(s) con API-Football: ${r.updatedCodes.join(", ")}. El sync en vivo los recogerá solo.`,
      ).catch(() => {});
    }
    // Partidos con ambos equipos pero sin casar con el proveedor: aviso para
    // revisar a mano (evita quedarse sin sync sin darse cuenta).
    if (r.unmatched.length > 0) {
      await sendTelegramMessage(
        `⚠️ <b>Auto-map</b>\nCon ambos equipos pero sin fixture del proveedor: ${r.unmatched
          .map(escapeHTML)
          .join(", ")}. Revisar en /admin/sync.`,
      ).catch(() => {});
    }
  } catch (e) {
    await sendTelegramMessage(
      `⚠️ <b>Auto-map falló</b>\n${escapeHTML((e as Error).message)} — mapea a mano con scripts/map-fixtures.ts si hace falta.`,
    ).catch(() => {});
  }
}
