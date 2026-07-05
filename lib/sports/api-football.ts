/**
 * Cliente y parsers de API-Football (api-sports.io) para el Mundial 2026.
 *
 * Las funciones PURAS (mapFixtureStatus, isAbnormalStatus, mapEventsToScorers,
 * diffMatch) no tocan red ni DB y están testeadas en `__tests__/`. El cliente
 * (fetchLiveFixtures, fetchFixtureById, fetchFixtureEvents) hace fetch con
 * timeout + reintentos y NO interpreta: devuelve el JSON crudo tipado.
 *
 * Identificadores del torneo: league=1 (FIFA World Cup), season=2026.
 */

export const WORLD_CUP_LEAGUE_ID = 1;
export const WORLD_CUP_SEASON = 2026;

const API_BASE = "https://v3.football.api-sports.io";

// ─────────────────────────── Tipos crudos (mínimos) ───────────────────────────
// Solo modelamos los campos que usamos. API-Football devuelve mucho más.

export type AfTeam = { id: number; name: string; winner: boolean | null };
export type AfFixtureItem = {
  fixture: { id: number; status: { short: string; elapsed: number | null } };
  teams: { home: AfTeam; away: AfTeam };
  goals: { home: number | null; away: number | null };
  score: { penalty: { home: number | null; away: number | null } };
};
export type AfEvent = {
  time: { elapsed: number | null; extra: number | null };
  team: { id: number; name: string };
  player: { id: number | null; name: string | null };
  type: string; // "Goal" | "Card" | "subst" | "Var"
  detail: string; // "Normal Goal" | "Own Goal" | "Penalty" | "Missed Penalty"
  // En la TANDA de penaltis, API-Football manda los goles como type "Goal" +
  // detail "Penalty" con comments "Penalty Shootout". Lo usamos para EXCLUIRLOS:
  // un gol de la tanda no es goleador del partido.
  comments?: string | null;
};

// ─────────────────────────── Tipos normalizados ───────────────────────────

export type ProviderStatus = "scheduled" | "live" | "finished";

/** Un gol del proveedor, AÚN sin mapear a nuestro players.id. */
export type ProviderScorer = {
  providerPlayerId: number | null;
  playerName: string;
  /** Lado al que pertenece el JUGADOR que marcó (su equipo de plantilla). */
  side: "home" | "away";
  minute: number | null;
  isOwnGoal: boolean;
  isPenalty: boolean;
};

export type ProviderFixture = {
  fixtureId: number;
  rawStatus: string;
  status: ProviderStatus;
  /** Minuto transcurrido (status.elapsed). Null si no aplica / no en vivo. */
  elapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
  wentToPens: boolean;
  homePenScore: number | null;
  awayPenScore: number | null;
  /** Lado ganador en KO (de teams.home/away.winner). Null si empate/no aplica. */
  winnerSide: "home" | "away" | null;
  homeProviderTeamId: number;
  awayProviderTeamId: number;
};

// ─────────────────────────── Parsers PUROS ───────────────────────────

const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);
// Estados anómalos: no debemos auto-finalizar ni revertir a la ligera.
// El sync los "retiene" (no escribe) y avisa para revisión manual.
const ABNORMAL = new Set(["PST", "CANC", "ABD", "AWD", "WO", "SUSP", "TBD"]);

export function mapFixtureStatus(short: string): ProviderStatus {
  if (FINISHED.has(short)) return "finished";
  if (LIVE.has(short)) return "live";
  return "scheduled"; // NS y cualquier otro
}

export function isAbnormalStatus(short: string): boolean {
  return ABNORMAL.has(short);
}

/** Normaliza un item de /fixtures a nuestra forma. */
export function parseFixture(item: AfFixtureItem): ProviderFixture {
  const short = item.fixture.status.short;
  return {
    fixtureId: item.fixture.id,
    rawStatus: short,
    status: mapFixtureStatus(short),
    elapsed: item.fixture.status.elapsed,
    homeScore: item.goals.home,
    awayScore: item.goals.away,
    wentToPens: short === "PEN",
    homePenScore: item.score.penalty.home,
    awayPenScore: item.score.penalty.away,
    winnerSide: item.teams.home.winner
      ? "home"
      : item.teams.away.winner
        ? "away"
        : null,
    homeProviderTeamId: item.teams.home.id,
    awayProviderTeamId: item.teams.away.id,
  };
}

/**
 * Eventos → goleadores. Solo cuenta `type === "Goal"` EXCLUYENDO
 * "Missed Penalty" (penalti fallado no es gol). El minuto suma `elapsed` +
 * `extra` (descuento).
 *
 * `side` es SIEMPRE la plantilla del JUGADOR (para mapearlo a nuestros
 * players y porque `matchScorers.teamId` = equipo del jugador). Ojo con los
 * AUTOGOLES: API-Football atribuye el evento de gol en propia al equipo
 * BENEFICIARIO (al que cuenta el gol), no al del jugador, así que para
 * autogoles invertimos el lado — el jugador es del rival.
 */
export function mapEventsToScorers(
  events: AfEvent[],
  homeProviderTeamId: number,
  awayProviderTeamId: number,
): ProviderScorer[] {
  return events
    // Excluimos penaltis fallados y, sobre todo, los goles de la TANDA de
    // penaltis (comments "Penalty Shootout"): no cuentan como goleador del
    // partido (que es a 120′). Los penaltis DENTRO del juego sí cuentan.
    .filter(
      (e) =>
        e.type === "Goal" &&
        e.detail !== "Missed Penalty" &&
        e.comments !== "Penalty Shootout",
    )
    .map((e) => {
      const minute =
        e.time.elapsed != null ? e.time.elapsed + (e.time.extra ?? 0) : null;
      const isOwnGoal = e.detail === "Own Goal";
      const eventSide: "home" | "away" =
        e.team.id === homeProviderTeamId ? "home" : "away";
      // En autogoles el evento viene a nombre del beneficiario → el jugador
      // está en el equipo contrario.
      const side: "home" | "away" = isOwnGoal
        ? eventSide === "home"
          ? "away"
          : "home"
        : eventSide;
      return {
        providerPlayerId: e.player.id,
        playerName: e.player.name ?? "—",
        side,
        minute,
        isOwnGoal,
        isPenalty: e.detail === "Penalty",
      };
    });
}

/**
 * Forma normalizada de "cómo está un partido AHORA en nuestra DB" para
 * comparar con lo que trae el proveedor y decidir si hay que escribir
 * (dirty-check). Comparamos solo lo que importa para puntuar/mostrar.
 */
export type MatchSnapshot = {
  status: ProviderStatus;
  homeScore: number | null;
  awayScore: number | null;
  wentToPens: boolean;
  homePenScore: number | null;
  awayPenScore: number | null;
  /** Multiconjunto de goles para detectar cambios en goleadores. */
  scorerKeys: string[];
};

/** ¿El estado del proveedor difiere del nuestro? (orden de scorerKeys irrelevante) */
export function diffMatch(current: MatchSnapshot, next: MatchSnapshot): boolean {
  if (
    current.status !== next.status ||
    current.homeScore !== next.homeScore ||
    current.awayScore !== next.awayScore ||
    current.wentToPens !== next.wentToPens ||
    current.homePenScore !== next.homePenScore ||
    current.awayPenScore !== next.awayPenScore
  ) {
    return true;
  }
  const a = [...current.scorerKeys].sort();
  const b = [...next.scorerKeys].sort();
  if (a.length !== b.length) return true;
  return a.some((v, i) => v !== b[i]);
}

// ─────────────────────────── Cliente (red) ───────────────────────────

class ApiFootballError extends Error {}

async function afFetch<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new ApiFootballError("API_FOOTBALL_KEY no configurada");
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        headers: { "x-apisports-key": key },
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!res.ok) throw new ApiFootballError(`HTTP ${res.status} en ${path}`);
      const json = (await res.json()) as { response: T; errors?: unknown };
      // API-Football devuelve 200 con `errors` poblado en fallos lógicos
      // (array vacío [] = ok; array u objeto con contenido = error).
      const errs = json.errors;
      const hasErrors = Array.isArray(errs)
        ? errs.length > 0
        : !!errs && typeof errs === "object" && Object.keys(errs).length > 0;
      if (hasErrors) throw new ApiFootballError(`API errors: ${JSON.stringify(errs)}`);
      return json.response;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new ApiFootballError("fetch falló");
}

/** Fixtures en vivo del Mundial ahora mismo. */
export function fetchLiveFixtures(): Promise<AfFixtureItem[]> {
  return afFetch<AfFixtureItem[]>("/fixtures", {
    league: WORLD_CUP_LEAGUE_ID,
    season: WORLD_CUP_SEASON,
    live: "all",
  });
}

/** Un fixture concreto por id (para confirmación final / ventana). */
export async function fetchFixtureById(fixtureId: number): Promise<AfFixtureItem | null> {
  const res = await afFetch<AfFixtureItem[]>("/fixtures", { id: fixtureId });
  return res[0] ?? null;
}

/** Eventos (goles, tarjetas…) de un fixture. */
export function fetchFixtureEvents(fixtureId: number): Promise<AfEvent[]> {
  return afFetch<AfEvent[]>("/fixtures/events", { fixture: fixtureId });
}

/** Equipos del torneo (id + nombre del proveedor). */
export function fetchLeagueTeams(): Promise<{ team: { id: number; name: string } }[]> {
  return afFetch("/teams", {
    league: WORLD_CUP_LEAGUE_ID,
    season: WORLD_CUP_SEASON,
  });
}

/** Fila mínima de /fixtures que usamos para mapear nuestros matches ↔ proveedor. */
export type AfFixtureListItem = {
  fixture: { id: number; date: string };
  teams: { home: { id: number }; away: { id: number } };
};

/** Todos los fixtures del torneo (para mapear provider_fixture_id por equipos+fecha). */
export function fetchLeagueFixtures(): Promise<AfFixtureListItem[]> {
  return afFetch<AfFixtureListItem[]>("/fixtures", {
    league: WORLD_CUP_LEAGUE_ID,
    season: WORLD_CUP_SEASON,
  });
}

/** Jugador en la plantilla del proveedor. */
export type AfSquadPlayer = {
  id: number;
  name: string;
  number: number | null;
  position: string | null;
};

/**
 * Plantilla de un equipo del proveedor (`/players/squads`). Devuelve un array
 * con un único elemento `{ team, players }`.
 */
export function fetchTeamSquad(
  providerTeamId: number,
): Promise<{ team: { id: number; name: string }; players: AfSquadPlayer[] }[]> {
  return afFetch("/players/squads", { team: providerTeamId });
}
