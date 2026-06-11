import { Crown, Footprints, Layers, Network, Sparkles, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LedgerCategory } from "@/lib/scoring/ledger-labels";

/**
 * Estilo visual por categoría de puntuación: color identificativo (token CSS,
 * con variante clara/oscura) + icono. MARCADORES mantiene el rojo arena; el
 * resto tiene su propio color para distinguirlas en el modo Completo. En los
 * modos simples (Marcador / Solo Ganador) solo hay entradas de "match", así
 * que todo sale rojo de forma natural.
 */
export const CATEGORY_META: Record<
  LedgerCategory,
  { color: string; Icon: LucideIcon }
> = {
  match: { color: "var(--color-arena)", Icon: Target },
  scorer: { color: "var(--color-cat-scorer)", Icon: Footprints },
  group: { color: "var(--color-cat-group)", Icon: Layers },
  bracket: { color: "var(--color-cat-bracket)", Icon: Network },
  topScorer: { color: "var(--color-cat-bota)", Icon: Crown },
  special: { color: "var(--color-cat-special)", Icon: Sparkles },
};

/** Color de una categoría (fallback arena). */
export function categoryColor(category: LedgerCategory | null | undefined): string {
  return category ? CATEGORY_META[category].color : "var(--color-arena)";
}
