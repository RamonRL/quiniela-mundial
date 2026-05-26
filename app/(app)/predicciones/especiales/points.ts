import type { PointsHintItem } from "@/components/predictions/points-hint";

/**
 * Helpers para sacar el desglose de puntos de un `SpecialDef.pointsConfigJson`.
 * Centralizado aquí para que tanto la versión full (specials-form.tsx) como
 * el tour (tour/tour-client.tsx) muestren los mismos números.
 *
 * Soportamos 3 formas conocidas del JSON:
 *  - `{ correct, exactRoundBonus? }`  → team_with_round.
 *  - `{ maxPoints }`                  → respuesta única (yes_no, número…).
 *  - `{ perRound: { ronda: pts } }`   → variable por ronda.
 */

export function maxPointsForSpecial(config: unknown): number | null {
  if (!config || typeof config !== "object") return null;
  const obj = config as Record<string, unknown>;
  if (typeof obj.correct === "number") {
    const bonus = typeof obj.exactRoundBonus === "number" ? obj.exactRoundBonus : 0;
    return obj.correct + bonus;
  }
  if (typeof obj.maxPoints === "number") return obj.maxPoints;
  if (obj.perRound && typeof obj.perRound === "object") {
    const values = Object.values(obj.perRound as Record<string, unknown>).filter(
      (v): v is number => typeof v === "number",
    );
    return values.length > 0 ? Math.max(...values) : null;
  }
  return null;
}

/**
 * Devuelve los items que el PointsHint debe mostrar para esta pregunta
 * especial. Se ajusta al shape del config y, cuando hay bonus, lo separa
 * en una fila bonus indentada.
 */
export function pointsHintItemsForSpecial(config: unknown): PointsHintItem[] {
  if (!config || typeof config !== "object") return [];
  const obj = config as Record<string, unknown>;

  // Formato {correct, exactRoundBonus?}: típico team_with_round.
  if (typeof obj.correct === "number") {
    const items: PointsHintItem[] = [
      { points: obj.correct, label: "Aciertas la selección" },
    ];
    if (typeof obj.exactRoundBonus === "number" && obj.exactRoundBonus > 0) {
      items.push({
        points: obj.exactRoundBonus,
        prefix: "+",
        label: "Bonus si además aciertas la ronda exacta",
        bonus: true,
      });
    }
    return items;
  }

  // Formato {maxPoints}: respuesta única sin bonus.
  if (typeof obj.maxPoints === "number") {
    return [{ points: obj.maxPoints, label: "Si aciertas" }];
  }

  // Formato {perRound: {ronda: pts}}: distintos puntos según la ronda
  // a la que llega tu pick. Listamos cada ronda como un item separado.
  if (obj.perRound && typeof obj.perRound === "object") {
    const entries = Object.entries(obj.perRound as Record<string, unknown>)
      .filter(([, v]) => typeof v === "number")
      .map(([round, pts]) => ({
        round,
        points: pts as number,
      }))
      .sort((a, b) => b.points - a.points);
    return entries.map((e) => ({
      points: e.points,
      label: `Si tu pick llega a ${formatRoundLabel(e.round)}`,
    }));
  }

  return [];
}

const ROUND_LABEL_ES: Record<string, string> = {
  group: "fase de grupos",
  r32: "dieciseisavos",
  r16: "octavos",
  qf: "cuartos",
  sf: "semifinales",
  final: "la final",
  champion: "campeón",
};

function formatRoundLabel(round: string): string {
  return ROUND_LABEL_ES[round] ?? round;
}
