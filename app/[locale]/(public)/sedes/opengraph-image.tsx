import { brandedOg } from "@/lib/og-assets";

export const runtime = "nodejs";
export const alt = "Sedes del Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function SedesIndexOpenGraph() {
  return brandedOg({
    eyebrow: "Mundial 2026 · Sedes",
    title: ["16 estadios", "3 países"],
    subtitle:
      "Estados Unidos, Canadá y México albergan el Mundial 2026 en 16 sedes repartidas por 11 ciudades.",
    bottomChip: "USA · CAN · MEX",
  });
}
