import { describe, expect, it } from "vitest";
import {
  resolveThirdPlaces,
  WINNER_TO_R32_MATCH,
  type ThirdPlaceTeam,
} from "../third-place";
import { ANNEX_C } from "../annex-c-data";

let id = 0;
const t = (group: string, points: number, gf: number, ga: number): ThirdPlaceTeam => ({
  group,
  teamId: ++id,
  points,
  goalsFor: gf,
  goalsAgainst: ga,
});

const ALL_GROUPS = "ABCDEFGHIJKL".split("");

describe("resolveThirdPlaces", () => {
  it("ordena por pts → DG → GF y marca los 8 que clasifican", () => {
    // 12 terceros con puntos decrecientes claros A>B>...>L.
    const thirds = ALL_GROUPS.map((g, i) => t(g, 12 - i, 5, 5));
    const r = resolveThirdPlaces(thirds);
    expect(r.complete).toBe(true);
    expect(r.ambiguousCut).toBe(false);
    expect(r.ranked.slice(0, 8).every((x) => x.qualifies)).toBe(true);
    expect(r.ranked.slice(8).every((x) => !x.qualifies)).toBe(true);
    expect(r.qualifiedGroups).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
  });

  it("detecta corte ambiguo cuando 8.º y 9.º empatan a todo", () => {
    const thirds = [
      ...["A", "B", "C", "D", "E", "F", "G"].map((g) => t(g, 9, 5, 0)),
      t("H", 3, 4, 4), // 8.º
      t("I", 3, 4, 4), // 9.º — empata a pts/DG/GF con H
      ...["J", "K", "L"].map((g) => t(g, 0, 0, 9)),
    ];
    const r = resolveThirdPlaces(thirds);
    expect(r.ambiguousCut).toBe(true);
    expect(r.allocation).toBeNull();
    expect(r.qualifiedGroups).toBeNull();
  });

  it("NO es ambiguo si el empate 8.º/9.º se rompe por goles a favor", () => {
    const thirds = [
      ...["A", "B", "C", "D", "E", "F", "G"].map((g) => t(g, 9, 5, 0)),
      t("H", 3, 5, 5), // 8.º — más GF
      t("I", 3, 4, 4), // 9.º
      ...["J", "K", "L"].map((g) => t(g, 0, 0, 9)),
    ];
    const r = resolveThirdPlaces(thirds);
    expect(r.ambiguousCut).toBe(false);
    expect(r.qualifiedGroups).toContain("H");
    expect(r.qualifiedGroups).not.toContain("I");
  });

  it("no resuelve asignación si faltan terceros (fase de grupos en curso)", () => {
    const r = resolveThirdPlaces(ALL_GROUPS.slice(0, 6).map((g) => t(g, 3, 3, 3)));
    expect(r.complete).toBe(false);
    expect(r.allocation).toBeNull();
    expect(r.ranked).toHaveLength(6);
  });

  it("asigna casillas según el Anexo C para el conjunto A-H", () => {
    const thirds = ALL_GROUPS.map((g, i) => t(g, 12 - i, 5, 5)); // clasifican A-H
    const r = resolveThirdPlaces(thirds);
    // Fila 495 del Anexo C: combinación ABCDEFGH.
    const expected = ANNEX_C["ABCDEFGH"];
    // allocation[matchCode] = grupo; reconstruimos el orden de columnas.
    const cols = ["A", "B", "D", "E", "G", "I", "K", "L"];
    const got = cols.map((w) => r.allocation![WINNER_TO_R32_MATCH[w]]);
    expect(got).toEqual([...expected]);
  });

  it("toda asignación cae en una casilla de tercero del R32 y es biyección", () => {
    // Combinación canónica EFGHIJKL (fila 1): E–L arriba, A–D fuera.
    const groups = "EFGHIJKL".split("");
    const thirds = [
      ...groups.map((g, i) => t(g, 20 - i, 5, 1)),
      ...["A", "B", "C", "D"].map((g) => t(g, 0, 0, 9)),
    ];
    const r = resolveThirdPlaces(thirds);
    expect(r.qualifiedGroups).toEqual(groups.slice().sort());
    const matchCodes = Object.keys(r.allocation!);
    expect(matchCodes.sort()).toEqual(
      ["M74", "M77", "M79", "M80", "M81", "M82", "M85", "M87"].sort(),
    );
    // Los grupos asignados son exactamente los 8 clasificados, sin repetición.
    expect([...new Set(Object.values(r.allocation!))].sort()).toEqual(groups.sort());
  });

  it("cubre las 495 combinaciones sin huecos", () => {
    expect(Object.keys(ANNEX_C)).toHaveLength(495);
  });
});
