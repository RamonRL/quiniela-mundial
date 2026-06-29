import { describe, expect, it } from "vitest";
import {
  diffMatch,
  isAbnormalStatus,
  mapEventsToScorers,
  mapFixtureStatus,
  parseFixture,
  type AfEvent,
  type AfFixtureItem,
  type MatchSnapshot,
} from "../api-football";

describe("mapFixtureStatus", () => {
  it("mapea NS y desconocidos a scheduled", () => {
    expect(mapFixtureStatus("NS")).toBe("scheduled");
    expect(mapFixtureStatus("XYZ")).toBe("scheduled");
  });
  it("mapea estados en juego a live", () => {
    for (const s of ["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"]) {
      expect(mapFixtureStatus(s)).toBe("live");
    }
  });
  it("mapea FT/AET/PEN a finished", () => {
    expect(mapFixtureStatus("FT")).toBe("finished");
    expect(mapFixtureStatus("AET")).toBe("finished");
    expect(mapFixtureStatus("PEN")).toBe("finished");
  });
  it("detecta estados anómalos", () => {
    expect(isAbnormalStatus("PST")).toBe(true);
    expect(isAbnormalStatus("CANC")).toBe(true);
    expect(isAbnormalStatus("FT")).toBe(false);
  });
});

describe("parseFixture", () => {
  const base: AfFixtureItem = {
    fixture: { id: 555, status: { short: "PEN", elapsed: 120 } },
    teams: {
      home: { id: 10, name: "A", winner: false },
      away: { id: 20, name: "B", winner: true },
    },
    goals: { home: 1, away: 1 },
    score: { penalty: { home: 3, away: 4 } },
  };
  it("normaliza un KO a penaltis con ganador y pens", () => {
    const f = parseFixture(base);
    expect(f.status).toBe("finished");
    expect(f.wentToPens).toBe(true);
    expect(f.homeScore).toBe(1);
    expect(f.awayScore).toBe(1);
    expect(f.homePenScore).toBe(3);
    expect(f.awayPenScore).toBe(4);
    expect(f.winnerSide).toBe("away");
  });
});

describe("mapEventsToScorers", () => {
  const ev = (over: Partial<AfEvent>): AfEvent => ({
    time: { elapsed: 10, extra: null },
    team: { id: 10, name: "A" },
    player: { id: 100, name: "Jugador" },
    type: "Goal",
    detail: "Normal Goal",
    ...over,
  });

  it("ignora penaltis fallados y eventos no-gol", () => {
    const scorers = mapEventsToScorers(
      [
        ev({}),
        ev({ type: "Card", detail: "Yellow Card" }),
        ev({ detail: "Missed Penalty" }),
      ],
      10,
      20,
    );
    expect(scorers).toHaveLength(1);
  });

  it("excluye los goles de la tanda de penaltis (no son goleador del partido)", () => {
    const scorers = mapEventsToScorers(
      [
        ev({ detail: "Penalty", comments: null }), // penalti en juego → cuenta
        ev({ detail: "Penalty", comments: "Penalty Shootout" }), // tanda → fuera
      ],
      10,
      20,
    );
    expect(scorers).toHaveLength(1);
    expect(scorers[0].isPenalty).toBe(true);
  });

  it("suma el descuento al minuto y marca penalti/autogol", () => {
    const scorers = mapEventsToScorers(
      [
        ev({ time: { elapsed: 45, extra: 2 }, detail: "Penalty" }),
        // API-Football atribuye el evento del autogol al equipo BENEFICIARIO
        // (aquí home, id 10), aunque el jugador (id 200) sea del rival.
        ev({ player: { id: 200, name: "Defensa" }, detail: "Own Goal", team: { id: 10, name: "A" } }),
      ],
      10,
      20,
    );
    expect(scorers[0].minute).toBe(47);
    expect(scorers[0].isPenalty).toBe(true);
    expect(scorers[0].side).toBe("home");
    expect(scorers[1].isOwnGoal).toBe(true);
    // El lado del autogol se invierte al del JUGADOR (away), no el beneficiario.
    expect(scorers[1].side).toBe("away");
  });
});

describe("diffMatch", () => {
  const snap = (over: Partial<MatchSnapshot> = {}): MatchSnapshot => ({
    status: "live",
    homeScore: 1,
    awayScore: 0,
    wentToPens: false,
    homePenScore: null,
    awayPenScore: null,
    scorerKeys: ["100:7"],
    ...over,
  });
  it("no hay cambio si todo coincide (orden de scorers irrelevante)", () => {
    expect(diffMatch(snap({ scorerKeys: ["100:7", "200:30"] }), snap({ scorerKeys: ["200:30", "100:7"] }))).toBe(false);
  });
  it("detecta cambio de marcador", () => {
    expect(diffMatch(snap(), snap({ homeScore: 2 }))).toBe(true);
  });
  it("detecta nuevo goleador", () => {
    expect(diffMatch(snap(), snap({ scorerKeys: ["100:7", "300:80"] }))).toBe(true);
  });
  it("detecta transición de estado", () => {
    expect(diffMatch(snap({ status: "live" }), snap({ status: "finished" }))).toBe(true);
  });
});
