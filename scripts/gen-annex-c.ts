/**
 * Genera `lib/bracket/annex-c-data.ts` a partir del wikitexto crudo del Anexo C
 * (tabla de 495 combinaciones de FIFA para los mejores terceros del Mundial
 * 2026). Parsea, VALIDA exhaustivamente y vuelca un lookup determinista.
 *
 *   node /tmp annexc.wiki → este script lee /tmp/annexc.wiki
 *   pnpm tsx scripts/gen-annex-c.ts
 *
 * No toca DB. Idempotente.
 */
import { readFileSync, writeFileSync } from "node:fs";

// Orden de columnas de la tabla = ganadores de grupo que enfrentan a un tercero.
const WINNER_COLUMNS = ["A", "B", "D", "E", "G", "I", "K", "L"] as const;

// Subconjunto de grupos elegibles para cada columna (placeholders R32 oficiales).
const ELIGIBLE: Record<string, string[]> = {
  A: ["C", "E", "F", "H", "I"], // match 79
  B: ["E", "F", "G", "I", "J"], // match 85
  D: ["B", "E", "F", "I", "J"], // match 81
  E: ["A", "B", "C", "D", "F"], // match 74
  G: ["A", "E", "H", "I", "J"], // match 82
  I: ["C", "D", "F", "G", "H"], // match 77
  K: ["D", "E", "I", "J", "L"], // match 87
  L: ["E", "H", "I", "J", "K"], // match 80
};

const raw = readFileSync("/tmp/annexc.wiki", "utf8");

// Trocea por encabezado de fila. El primer trozo es la cabecera de la tabla.
const chunks = raw.split(/!\s*scope="row"\s*\|/).slice(1);
if (chunks.length !== 495) {
  throw new Error(`Esperaba 495 filas, encontré ${chunks.length}`);
}

const table: Record<string, string[]> = {};
const errors: string[] = [];

chunks.forEach((chunk, idx) => {
  const rowNo = idx + 1;
  // Corta en el separador de fila siguiente para no sangrar contenido.
  const body = chunk.split(/\n\|-/)[0];

  const numMatch = body.match(/^\s*(\d+)/);
  if (!numMatch || Number(numMatch[1]) !== rowNo) {
    errors.push(`Fila ${rowNo}: número inesperado "${numMatch?.[1]}"`);
    return;
  }

  // Grupos clasificados = letras en negrita '''X'''.
  const groups = [...body.matchAll(/'''([A-L])'''/g)].map((m) => m[1]);
  // Asignaciones 3X en orden de columnas.
  const assigns = [...body.matchAll(/\b3([A-L])\b/g)].map((m) => m[1]);

  if (groups.length !== 8) errors.push(`Fila ${rowNo}: ${groups.length} grupos (esperaba 8)`);
  if (assigns.length !== 8) errors.push(`Fila ${rowNo}: ${assigns.length} asignaciones (esperaba 8)`);
  if (errors.length) return;

  const groupSet = new Set(groups);
  const assignSet = new Set(assigns);
  // Las asignaciones deben ser exactamente los 8 grupos clasificados (biyección).
  if (assignSet.size !== 8 || ![...groupSet].every((g) => assignSet.has(g))) {
    errors.push(`Fila ${rowNo}: asignaciones ${assigns.join(",")} no casan con grupos ${groups.join(",")}`);
    return;
  }
  // Cada asignación debe respetar el subconjunto elegible de su columna.
  assigns.forEach((g, i) => {
    const col = WINNER_COLUMNS[i];
    if (!ELIGIBLE[col].includes(g)) {
      errors.push(`Fila ${rowNo}: 3${g} no es elegible para 1${col} (col ${i})`);
    }
  });

  const key = [...groupSet].sort().join("");
  if (table[key]) errors.push(`Fila ${rowNo}: combinación duplicada ${key}`);
  table[key] = assigns;
});

if (errors.length) {
  console.error(`❌ ${errors.length} errores de validación:`);
  console.error(errors.slice(0, 20).join("\n"));
  process.exit(1);
}

const keys = Object.keys(table);
if (keys.length !== 495) {
  console.error(`❌ ${keys.length} combinaciones únicas (esperaba 495)`);
  process.exit(1);
}

const out = `/**
 * GENERADO por scripts/gen-annex-c.ts — NO EDITAR A MANO.
 * Anexo C del reglamento FIFA Mundial 2026: las 495 combinaciones de los 8
 * mejores terceros → casilla del R32. Validado: cada fila es una biyección de
 * los 8 grupos clasificados a las 8 columnas, respetando los subconjuntos
 * elegibles oficiales.
 *
 * Clave: los 8 grupos clasificados, en MAYÚSCULAS y ORDEN ALFABÉTICO, unidos
 * (p.ej. "EFGHIJKL"). Valor: el grupo del tercero asignado a cada columna,
 * en el orden ANNEX_C_WINNER_COLUMNS.
 */

/** Ganadores de grupo que enfrentan a un tercero, en orden de columna. */
export const ANNEX_C_WINNER_COLUMNS = ${JSON.stringify(WINNER_COLUMNS)} as const;

export const ANNEX_C: Record<string, readonly [string, string, string, string, string, string, string, string]> = ${JSON.stringify(
  table,
  null,
  0,
).replace(/\],/g, "],\n  ").replace(/^\{/, "{\n  ").replace(/\}$/, ",\n}")};
`;

writeFileSync("lib/bracket/annex-c-data.ts", out);
console.log(`✅ 495 combinaciones validadas → lib/bracket/annex-c-data.ts`);
