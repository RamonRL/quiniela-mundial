import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings, leagueSponsors } from "@/lib/db/schema";

/** Tag para invalidar la caché de patrocinadores efectivos (ver
 * `loadEffectiveSponsors`). El admin lo dispara con `revalidateTag` tras
 * cualquier alta/baja/movimiento de logo o cambio del banner global. */
export const SPONSORS_TAG = "sponsors";

export type SponsorLogo = {
  id: number;
  imageUrl: string;
  storagePath: string;
  alt: string | null;
  linkUrl: string | null;
  orderIndex: number;
};

/** Banner de afiliado por defecto, guardado en app_settings. Se muestra en las
 * quinielas que aún NO tienen patrocinador propio. */
export const GLOBAL_BANNER_KEY = "global_affiliate_banner";

export type GlobalBanner = {
  imageUrl: string;
  storagePath: string;
  alt: string | null;
  linkUrl: string | null;
  enabled: boolean;
};

/** Lee el banner global tal cual está guardado (para el admin), o null. */
export async function loadGlobalBannerRaw(): Promise<GlobalBanner | null> {
  const [row] = await db
    .select({ v: appSettings.valueJson })
    .from(appSettings)
    .where(eq(appSettings.key, GLOBAL_BANNER_KEY))
    .limit(1);
  const v = row?.v as Partial<GlobalBanner> | undefined;
  if (!v || typeof v.imageUrl !== "string" || !v.imageUrl) return null;
  return {
    imageUrl: v.imageUrl,
    storagePath: typeof v.storagePath === "string" ? v.storagePath : "",
    alt: v.alt ?? null,
    linkUrl: v.linkUrl ?? null,
    enabled: v.enabled === true,
  };
}

/** Logos de patrocinadores de una liga, en orden de aparición. */
export async function loadLeagueSponsors(leagueId: number): Promise<SponsorLogo[]> {
  return db
    .select({
      id: leagueSponsors.id,
      imageUrl: leagueSponsors.imageUrl,
      storagePath: leagueSponsors.storagePath,
      alt: leagueSponsors.alt,
      linkUrl: leagueSponsors.linkUrl,
      orderIndex: leagueSponsors.orderIndex,
    })
    .from(leagueSponsors)
    .where(eq(leagueSponsors.leagueId, leagueId))
    .orderBy(asc(leagueSponsors.orderIndex), asc(leagueSponsors.id));
}

async function computeEffectiveSponsors(leagueId: number): Promise<SponsorLogo[]> {
  const own = await loadLeagueSponsors(leagueId);
  if (own.length > 0) return own;
  const g = await loadGlobalBannerRaw();
  if (!g || !g.enabled) return [];
  return [
    {
      id: -1,
      imageUrl: g.imageUrl,
      storagePath: g.storagePath,
      alt: g.alt,
      linkUrl: g.linkUrl,
      orderIndex: 0,
    },
  ];
}

/**
 * Patrocinadores a MOSTRAR en una liga: los suyos propios; y si no tiene
 * ninguno, el banner de afiliado global (si está activo). Así las ligas que ya
 * tienen patrocinador propio NO ven el banner global.
 *
 * Cacheado: es IDÉNTICO para todos los miembros de una liga y solo cambia
 * cuando el admin toca patrocinadores. Sin esto, las tres páginas más visitadas
 * (dashboard, ranking, predicciones) son dinámicas por usuario y repetían 1-2
 * queries por carga. La caché se invalida al instante vía `revalidateTag` desde
 * las acciones de admin; el TTL de 5 min es solo red de seguridad. La key
 * incluye `leagueId` (lo añade `unstable_cache` automáticamente).
 */
export const loadEffectiveSponsors = unstable_cache(
  (leagueId: number) => computeEffectiveSponsors(leagueId),
  ["effective-sponsors"],
  { revalidate: 300, tags: [SPONSORS_TAG] },
);
