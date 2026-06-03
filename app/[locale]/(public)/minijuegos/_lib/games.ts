import type { LucideIcon } from "lucide-react";
import { Flag, Users2 } from "lucide-react";

export type MinigameDef = {
  slug: string;
  gameKey: string;
  /** Claves i18n (namespace "minigames") — el texto se resuelve en el render. */
  nameKey: string;
  taglineKey: string;
  descKey: string;
  icon: LucideIcon;
  /** "live" → jugable; "soon" → solo se muestra como teaser. */
  status: "live" | "soon";
};

export const MINIGAMES: MinigameDef[] = [
  {
    slug: "quien-es-quien",
    gameKey: "quien-es-quien",
    nameKey: "qqName",
    taglineKey: "qqTagline",
    descKey: "qqDesc",
    icon: Users2,
    status: "live",
  },
  {
    slug: "adivina-la-bandera",
    gameKey: "adivina-la-bandera",
    nameKey: "flagName",
    taglineKey: "flagTagline",
    descKey: "flagDesc",
    icon: Flag,
    status: "live",
  },
];

export function findGame(slug: string): MinigameDef | null {
  return MINIGAMES.find((g) => g.slug === slug) ?? null;
}
