/**
 * Emparejado de jugadores nuestros ↔ API-Football para vincular
 * `providerPlayerId`. Lógica PURA (sin DB ni red): el cliente la usa para
 * PROPONER vínculos que un admin revisa antes de aplicar — por eso aquí sí nos
 * permitimos heurísticas difusas (apellido aproximado, orden invertido,
 * inicial), que serían arriesgadas en automático pero seguras con revisión
 * humana.
 */

export type ApiSquadPlayer = {
  id: number;
  name: string;
  number: number | null;
  position: string | null;
};

export function norm(s: string): string {
  return s
    // Caracteres que NFD no descompone (turco ı/İ, nórdico ø/å, polaco ł,
    // croata đ…). Sin esto, "Yıldız" o "Ødegaard" se rompían al matchear.
    .replace(/[ıİ]/g, "i")
    .replace(/[øØ]/g, "o")
    .replace(/[åÅ]/g, "a")
    .replace(/[łŁ]/g, "l")
    .replace(/[đĐ]/g, "d")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(name: string): string[] {
  return norm(name)
    .split(" ")
    .filter((w) => w.length > 0);
}

function surnameOf(name: string): string {
  const t = tokens(name);
  return t[t.length - 1] ?? "";
}

/**
 * Apellidos (último token) que se repiten en una plantilla → no fiables como
 * apellido (señal de nombres con el apellido delante, p. ej. coreano). Se pasa
 * a `proposeApiMatch` para saltar los tiers de último token.
 */
export function ambiguousSurnames(names: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const n of names) {
    const sn = surnameOf(n);
    if (sn.length >= 3) counts.set(sn, (counts.get(sn) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([s]) => s));
}

function firstTokenOf(name: string): string {
  return tokens(name)[0] ?? "";
}

/** Distancia de edición de Levenshtein (para variantes de transliteración). */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  const cur = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return prev[n];
}

export type MatchProposal = {
  apiId: number;
  apiName: string;
  /** Por qué se propone (para que el admin calibre confianza). */
  how: string;
};

/**
 * Propone el mejor candidato de API-Football para uno de nuestros jugadores,
 * en cascada de más a menos fiable. Devuelve `null` si nada casa con
 * suficiente unicidad. `available` son los jugadores del proveedor aún no
 * vinculados a nadie.
 */
export function proposeApiMatch(
  our: { name: string },
  available: ApiSquadPlayer[],
  opts: { ambiguousSurnames?: Set<string> } = {},
): MatchProposal | null {
  const nFull = norm(our.name);
  const sn = surnameOf(our.name);
  const ft = firstTokenOf(our.name);
  const ourSig = tokens(our.name).filter((t) => t.length >= 4);
  const mk = (a: ApiSquadPlayer, how: string): MatchProposal => ({
    apiId: a.id,
    apiName: a.name,
    how,
  });
  const uniq = (cands: ApiSquadPlayer[]) => (cands.length === 1 ? cands[0] : null);

  // Si nuestro "apellido" (último token) se repite en NUESTRA plantilla, no es
  // un apellido fiable (típico de nombres con el apellido delante, p. ej.
  // coreano "Son Heung-min" / "Cho Yu-min" comparten "min"). Saltamos los
  // tiers basados en último token y dejamos que gane el de primer token.
  const surnameReliable = sn.length >= 3 && !(opts.ambiguousSurnames?.has(sn) ?? false);

  // 1) nombre completo exacto
  let hit = uniq(available.filter((a) => norm(a.name) === nFull));
  if (hit) return mk(hit, "nombre exacto");

  // 2) apellido (último token) único
  hit = surnameReliable ? uniq(available.filter((a) => surnameOf(a.name) === sn)) : null;
  if (hit) return mk(hit, "apellido");

  // 3) apellido aproximado (distancia ≤1) único — transliteraciones
  hit =
    surnameReliable && sn.length >= 4
      ? uniq(available.filter((a) => levenshtein(surnameOf(a.name), sn) <= 1))
      : null;
  if (hit) return mk(hit, "apellido≈");

  // 4) orden invertido (apellido primero, p. ej. coreano): nuestro primer
  //    token aparece como token del nombre del proveedor, único.
  hit =
    ft.length >= 3
      ? uniq(available.filter((a) => tokens(a.name).includes(ft)))
      : null;
  if (hit) return mk(hit, "orden invertido");

  // 5) inicial + apellido: varios comparten apellido → desempata por la
  //    inicial del nombre de pila (p. ej. "J. David" → "Jonathan David").
  const surnameCands = surnameReliable
    ? available.filter(
        (a) =>
          surnameOf(a.name) === sn || (sn.length >= 4 && levenshtein(surnameOf(a.name), sn) <= 1),
      )
    : [];
  if (surnameCands.length > 1 && ft) {
    hit = uniq(surnameCands.filter((a) => firstTokenOf(a.name)[0] === ft[0]));
    if (hit) return mk(hit, "inicial+apellido");
  }

  // 6) token significativo (≥4) compartido, único (p. ej. apodo "Neymar")
  hit =
    ourSig.length > 0
      ? uniq(available.filter((a) => tokens(a.name).some((t) => ourSig.includes(t))))
      : null;
  if (hit) return mk(hit, "token");

  return null;
}

/**
 * Alias de nombres del proveedor (API-Football) → código FIFA nuestro, para
 * las variantes que no casan por nombre EN/ES directo. (Mismos que map-fixtures.)
 */
export const PROVIDER_TEAM_ALIASES: Record<string, string> = {
  "czech republic": "CZE",
  "bosnia herzegovina": "BIH",
  "congo dr": "COD",
  "cape verde islands": "CPV",
  usa: "USA",
};
