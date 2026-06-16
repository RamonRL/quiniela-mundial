---
description: Investiga un partido del Mundial 2026 y recomienda qué predecir en la quiniela (marcador, 1X2 y goleador), con criterio lógico.
argument-hint: <match_code>
---

Actúa como analista de fútbol. Para el partido `$ARGUMENTS` (p. ej. `M04`) del Mundial 2026, investiga y **recomienda al user qué meter en su quiniela**: marcador exacto, ganador (1X2) y un goleador. El criterio: **lógico y sobrio — favorece lo más probable**; deja margen a sorpresas SOLO si los datos las respaldan, pero recuerda que "lo obvio suele pasar".

> Esto es una RECOMENDACIÓN para que el user la introduzca a mano. No escribe en la BD ni hace commits.

## Procedimiento (no preguntes al user, ejecuta)

### 1. Hechos del partido (de NUESTRA BD)

Verifica que `$ARGUMENTS` parece un código de partido (regex `^[A-Z]{1,3}[0-9]{1,3}$`). Si es vacío o malformado, aborta pidiendo el código.

Carga el partido, equipos, fase/grupo, clasificación del grupo y las DOS plantillas (para poder sugerir un goleador que sea un jugador REAL y elegible):

```bash
pnpm tsx --env-file=.env.local --env-file-if-exists=.env -e "
import('@/lib/db').then(async ({db}) => {
  const {matches, teams, players, groups, groupStandings} = await import('@/lib/db/schema');
  const {eq, inArray, asc} = await import('drizzle-orm');
  const [m] = await db.select().from(matches).where(eq(matches.code, '$ARGUMENTS')).limit(1);
  if (!m) { console.log('NO_MATCH'); process.exit(0); }
  const tids = [m.homeTeamId, m.awayTeamId].filter(Boolean);
  const ts = tids.length ? await db.select().from(teams).where(inArray(teams.id, tids)) : [];
  const tById = new Map(ts.map((t) => [t.id, t]));
  const codeOf = (id) => tById.get(id)?.code ?? null;
  const team = (id) => tById.get(id) ? { code: tById.get(id).code, name: tById.get(id).name } : null;
  let grp = null; let standings = [];
  const gid = tById.get(m.homeTeamId)?.groupId;
  if (gid) {
    const [g] = await db.select().from(groups).where(eq(groups.id, gid)).limit(1);
    grp = g?.code ?? null;
    const st = await db.select().from(groupStandings).where(eq(groupStandings.groupId, gid)).orderBy(asc(groupStandings.position));
    standings = st.map((s) => ({ team: codeOf(s.teamId), pos: s.position, pl: s.played, w: s.won, d: s.drawn, l: s.lost, gf: s.goalsFor, ga: s.goalsAgainst, pts: s.points }));
  }
  const squads = tids.length ? await db.select().from(players).where(inArray(players.teamId, tids)) : [];
  const squadOf = (id) => squads.filter((p) => p.teamId === id).map((p) => ({ n: p.name, pos: p.position, num: p.jerseyNumber }));
  console.log(JSON.stringify({
    id: m.id, code: m.code, stage: m.stage, status: m.status, scheduledAt: m.scheduledAt, venue: m.venue, group: grp,
    home: team(m.homeTeamId), away: team(m.awayTeamId),
    homeScore: m.homeScore, awayScore: m.awayScore,
    standings,
    homeSquad: m.homeTeamId ? squadOf(m.homeTeamId) : [],
    awaySquad: m.awayTeamId ? squadOf(m.awayTeamId) : [],
  }, null, 2));
  process.exit(0);
}).catch((e) => { console.error('ERR', e.message); process.exit(1); });
"
```

- Si imprime `NO_MATCH`, aborta: el código no existe.
- Si `status` **es `finished`**: el partido YA se jugó. Díselo al user, dale el **resultado real** de la BD (`homeScore`-`awayScore`) y **para** — no tiene sentido predecir algo ya ocurrido.
- Guarda: equipos (código + nombre), fase, grupo, fecha, clasificación del grupo y las plantillas (lista de jugadores con posición — úsala para elegir un goleador real).

### 2. Investigación (forma y contexto)

Usa **WebSearch** + **WebFetch**, mínimo 2 fuentes serias (FIFA.com, ESPN, BBC, Marca, AS, Sofascore, Opta, prensa de cada país, casas de apuestas como referencia). Búsquedas tipo `"<Local> <Visitante> Mundial 2026 previa/pronóstico"`, `"<selección> últimos partidos forma"`, `"<selección> baja lesión Mundial 2026"`. Reúne:

- **Forma reciente** de cada selección (últimos 4-5 partidos): resultados, racha, si llegan enchufados o tocados.
- **Nivel relativo**: ranking FIFA, palmarés, plantilla (estrellas).
- **Bajas/lesiones/sanciones** clave que cambien el pronóstico.
- **Cara a cara** histórico reciente.
- **Qué se juega cada uno**: usa la clasificación del grupo cargada (si es fase de grupos) — a veces a uno le vale el empate, o uno está eliminado y especula.
- **Goleadores probables**: quién marca en esa selección, quién está en forma.
- **Pronósticos/cuotas** de medios o casas serias, como referencia (no como dogma).

Si una fuente da poco, prueba otra. No inventes datos: lo que no verifiques, no lo afirmes.

### 3. Razonamiento (piénsalo bien ANTES de responder)

- **Favorito**: decídelo cruzando forma + nivel + contexto (local, qué se juega).
- **Marcador**: el más probable. Por defecto gana el favorito por un margen sensato (1-0, 2-0, 2-1). Empate si están igualados o a alguno le vale. Goleada (3-0, 3-1…) solo si hay diferencia real de nivel/forma. **No fuerces sorpresas**; solo si los datos las respaldan, y aun así prioriza lo probable.
- **Coherencia**: el marcador y el 1X2 deben cuadrar entre sí.
- **Goleador sugerido**: elige un jugador **REAL de la plantilla cargada** (preferible el delantero referencia o el más en forma del favorito). Indica si además es buena apuesta a **primer goleador**.
- **Eliminatorias (stage ≠ group)**: valora si podría irse a prórroga/penaltis y dilo.

### 4. Respuesta al user

Formato claro y directo (en castellano):

```
🎯 <Local> <X> - <Y> <Visitante>

· 1X2: <1 / X / 2>
· Goleador: <jugador> (<sí/no> primer goleador)
· Confianza: <alta / media / baja>

Por qué: <2-4 frases con la lógica — favorito, forma, bajas, qué se juega>.
```

Cierra con un bloque `Sources:` con los enlaces consultados como markdown links.

## Reglas de oro

- **No preguntes** confirmación intermedia. Ejecuta del tirón.
- **No escribas en la BD ni hagas commits/pushes** — es solo una recomendación; el user la mete a mano en su quiniela.
- **Quién juega y las plantillas SIEMPRE de la BD** (paso 1). Forma, bajas y contexto, de la web.
- **Lógico y sobrio**: favorece lo probable; las sorpresas, solo si los datos las justifican. Lo obvio suele pasar.
- Solo partidos **no jugados**. Si está `finished`, da el resultado real y para.
- Sé honesto con la **confianza**: si el partido está muy abierto, dilo (media/baja).
