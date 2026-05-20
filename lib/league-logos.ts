/**
 * Galería de logos preset para quinielas privadas Free.
 *
 * Las quinielas Free eligen un logo de esta lista; las premium pueden
 * además subir un logo custom (corporativo). Los preset viven como
 * SVGs estáticos en `/public/league-logos/` para que se cacheen en
 * CDN y no consuman cuota de Supabase Storage.
 *
 * El `id` es el slug del archivo (sin extensión). La URL se construye
 * como `/league-logos/{id}.svg`. Si añades o renombras un preset, la
 * URL queda persistida en `leagues.logoUrl` de las ligas que lo eligieron,
 * así que no rompas los nombres existentes — solo añade.
 */
export type LeagueLogoPreset = {
  id: string;
  name: string;
  url: string;
};

export const PRESET_LEAGUE_LOGOS: ReadonlyArray<LeagueLogoPreset> = [
  { id: "ball", name: "Balón", url: "/league-logos/ball.svg" },
  { id: "trophy", name: "Trofeo", url: "/league-logos/trophy.svg" },
  { id: "shield", name: "Escudo", url: "/league-logos/shield.svg" },
  { id: "bolt", name: "Rayo", url: "/league-logos/bolt.svg" },
  { id: "flame", name: "Llama", url: "/league-logos/flame.svg" },
  { id: "crown", name: "Corona", url: "/league-logos/crown.svg" },
  { id: "megaphone", name: "Megáfono", url: "/league-logos/megaphone.svg" },
  { id: "target", name: "Diana", url: "/league-logos/target.svg" },
  { id: "star", name: "Estrella", url: "/league-logos/star.svg" },
  { id: "flag", name: "Banderín", url: "/league-logos/flag.svg" },
];

const PRESET_URLS = new Set(PRESET_LEAGUE_LOGOS.map((p) => p.url));

/** Valida si una URL apunta a un logo de la galería preset. */
export function isPresetLogoUrl(url: string | null | undefined): boolean {
  return !!url && PRESET_URLS.has(url);
}

/** Devuelve la URL canónica de un preset por id, o null si no existe. */
export function presetUrlById(id: string | null | undefined): string | null {
  if (!id) return null;
  const found = PRESET_LEAGUE_LOGOS.find((p) => p.id === id);
  return found?.url ?? null;
}

/** Default que se asigna a una liga Free que no elige ningún logo. */
export const DEFAULT_PRESET_LOGO_URL: string = PRESET_LEAGUE_LOGOS[0]!.url;
