import { brandedOg } from "@/lib/og-assets";

export const runtime = "nodejs";
export const alt = "Las 48 selecciones del Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function EquiposIndexOpenGraph() {
  return brandedOg({
    eyebrow: "Mundial 2026 · Selecciones",
    title: ["Las 48", "selecciones"],
    subtitle:
      "Plantilla completa, calendario de partidos y goleadores de cada selección clasificada al Mundial 2026.",
    bottomChip: "48 países",
  });
}
