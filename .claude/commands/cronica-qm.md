---
description: Busca info del partido ya jugado y redacta + publica una crónica periodística en Noticias (categoría "cronica"), al estilo del resto.
argument-hint: <match_code>
---

Redacta y publica la CRÓNICA del partido con código `$ARGUMENTS` (p. ej. `M01`) del Mundial 2026.

## Procedimiento (no preguntes al user, ejecuta)

### 1. Validación + hechos oficiales (fuente de la verdad)

Verifica que `$ARGUMENTS` parece un código de partido (regex `^[A-Z]{1,3}[0-9]{1,3}$`). Si es vacío o malformado, aborta pidiendo el código.

Carga el partido y sus hechos OFICIALES desde NUESTRA BD (resultado, goleadores, sede, fase, grupo). Estos datos mandan sobre cualquier fuente web:

```bash
pnpm tsx --env-file=.env.local --env-file-if-exists=.env -e "
import('@/lib/db').then(async ({db}) => {
  const {matches, teams, matchScorers, players, groups} = await import('@/lib/db/schema');
  const {eq, inArray, asc} = await import('drizzle-orm');
  const [m] = await db.select().from(matches).where(eq(matches.code, '$ARGUMENTS')).limit(1);
  if (!m) { console.log('NO_MATCH'); process.exit(0); }
  const tids = [m.homeTeamId, m.awayTeamId].filter(Boolean);
  const ts = tids.length ? await db.select().from(teams).where(inArray(teams.id, tids)) : [];
  const tById = new Map(ts.map((t) => [t.id, t]));
  const sc = await db.select().from(matchScorers).where(eq(matchScorers.matchId, m.id)).orderBy(asc(matchScorers.minute));
  const pids = [...new Set(sc.map((s) => s.playerId))];
  const pls = pids.length ? await db.select().from(players).where(inArray(players.id, pids)) : [];
  const pById = new Map(pls.map((p) => [p.id, p]));
  let grp = null; const gid = tById.get(m.homeTeamId)?.groupId;
  if (gid) { const [g] = await db.select().from(groups).where(eq(groups.id, gid)).limit(1); grp = g?.code ?? null; }
  const team = (id) => tById.get(id) ? { code: tById.get(id).code, name: tById.get(id).name } : null;
  console.log(JSON.stringify({
    id: m.id, code: m.code, stage: m.stage, status: m.status,
    scheduledAt: m.scheduledAt, venue: m.venue, group: grp,
    home: team(m.homeTeamId), away: team(m.awayTeamId),
    homeScore: m.homeScore, awayScore: m.awayScore,
    wentToPens: m.wentToPens, homePen: m.homeScorePen, awayPen: m.awayScorePen,
    winner: m.winnerTeamId ? (team(m.winnerTeamId)?.name) : null,
    scorers: sc.map((s) => ({ player: pById.get(s.playerId)?.name ?? '?', teamCode: tById.get(s.teamId)?.code, minute: s.minute, ownGoal: s.isOwnGoal, penalty: s.isPenalty, firstGoal: s.isFirstGoal })),
  }, null, 2));
  process.exit(0);
}).catch((e) => { console.error('ERR', e.message); process.exit(1); });
"
```

- Si imprime `NO_MATCH`, aborta: el código no existe.
- Si `status` **no es `finished`**, aborta avisando: la crónica es para un partido ya terminado (no escribas a partir de un partido en juego o sin empezar).
- Guarda mentalmente: `id`, equipos, marcador, penaltis (si los hubo), goleadores con minuto/autor/penalti/propia/primer-gol, sede, fase y grupo. **Estos son los hechos canónicos** — la web es solo para color y contexto.

### 2. Investigación (color y contexto, NO el marcador)

Usa **WebSearch** + **WebFetch** para reunir material narrativo del partido. Búsquedas tipo `"<Local> <Visitante> Mundial 2026 crónica/resumen/highlights"`, `"<Local> <Visitante> player ratings man of the match"`. Objetivos:

- **Relato del partido**: cómo arrancó, quién dominó, el momento que lo decidió, reacción tras los goles, recta final.
- **Figura del partido** (MVP) y actuaciones destacadas (porteros, debutantes, veteranos).
- **Momentos clave**: paradón, palo, VAR, tarjeta roja, penalti, lesión, cambio que cambió el guion.
- **Anécdotas y curiosidades**: récords (goleador más joven/veterano, primer gol del Mundial, racha histórica entre selecciones), polémicas arbitrales, celebraciones, ambiente/asistencia, frase de un protagonista.
- **Datos**: posesión, tiros, xG si están disponibles — solo si los encuentras, sin forzar.
- **Contexto**: qué significa para el grupo (cómo queda la clasificación), qué se juega cada uno en la próxima jornada.

Mínimo 2 fuentes serias (FIFA.com, ESPN, BBC, Marca, AS, Olympics.com, prensa de cada país). **Regla de oro: si una fuente da un marcador o goleador distinto al de NUESTRA BD, manda la BD.** No inventes nombres, minutos ni datos: si no lo verificas, omítelo.

### 3. Estilo y estructura (crónica periodística)

Sigue el tono editorial del resto de noticias. El `body` va en **markdown**, con esta guía (adapta secciones según el material):

```markdown
**<Local> <X>-<Y> <Visitante>** [lead de 2-4 frases con lo esencial: resultado, quién lo decidió, el momento clave y qué deja]. [Si hubo penaltis: menciona el <Pen. A-B>.]

## El partido

[3-6 párrafos de relato: arranque, control, los goles en orden (minuto + autor, marca el primer gol / penalti / en propia tal como salen en la BD), ocasiones, expulsiones, recta final. Cronológico y con ritmo.]

## Las claves

- **La figura**: <jugador> y por qué.
- **El momento**: <la jugada que cambió el partido>.
- [1-2 claves más: táctica, banquillo, portería…]

## Anécdotas y curiosidades

[2-4 datos: récords, estadísticas llamativas, polémica arbitral, ambiente, frase de un protagonista, contexto histórico del enfrentamiento.]

## Lo que deja para el Grupo <X>

[Cómo queda la clasificación del grupo tras el partido y qué necesita cada selección. Una frase sobre la próxima jornada.]

Revive el partido en la [ficha del encuentro](/partido/<id>), consulta el [Grupo <X>](/grupos) y el [calendario completo](/calendario).
```

**Reglas de redacción:**
- **No inventes nada.** El marcador y los goleadores son los de la BD; el resto, solo lo verificado en la web.
- Usa **acentos y caracteres reales** en nombres.
- **Links internos siempre**: `/partido/<id>`, `/equipos/<CODE>` de cada selección al mencionarlas la primera vez, `/grupos`, `/calendario`.
- Tono de crónica deportiva: vivo pero sobrio, sin hipérboles inventadas.

### 4. Campos derivados

- **slug** (kebab-case): `cronica-<local-kebab>-<visitante-kebab>-mundial-2026-<angulo>`. Ej.: `cronica-mexico-sudafrica-mundial-2026-gimenez`. Que el ángulo (1-3 palabras) identifique lo más memorable (goleador decisivo, remontada, sorpresa…).
- **title** (máx 140): `"<Local> <X>-<Y> <Visitante>: <ángulo>"`. Ej.: `"México 2-1 Sudáfrica: Santi Giménez estrena el Mundial de la anfitriona"`.
- **seoTitle** (máx 70): `"<Local> <X>-<Y> <Visitante> · Crónica Mundial 2026"`.
- **excerpt** (20-280): 1-2 frases con resultado + dato más fuerte (autor del gol decisivo, momento clave).
- **category**: `"cronica"`.
- **tags**: 4-7 strings. Ambas selecciones + goleadores clave + fase + "Mundial 2026".
- **relatedTeamCodes**: `["<CODE_LOCAL>", "<CODE_VISITANTE>"]` (local primero).
- **relatedMatchId**: el `id` numérico del partido (del paso 1) — clave para que la crónica salga vinculada en la página del partido.
- **coverAlt**: `"<Local> <X>-<Y> <Visitante> · crónica del Mundial 2026"`.

### 5. Generar JSON

Escribe `/tmp/cronica-$ARGUMENTS.json`:

```json
{
  "slug": "...",
  "title": "...",
  "seoTitle": "...",
  "excerpt": "...",
  "body": "Markdown completo, escapando \\n y \\\" como exige JSON",
  "category": "cronica",
  "tags": ["...", "..."],
  "relatedTeamCodes": ["<CODE_LOCAL>", "<CODE_VISITANTE>"],
  "relatedMatchId": <id>,
  "coverAlt": "<Local> <X>-<Y> <Visitante> · crónica del Mundial 2026"
}
```

No declares `coverFile`: el script intenta resolver el cover desde el primer `relatedTeamCodes` (la bandera del local). Si no hay, no es error — la noticia sale sin cover.

**Validación mental antes del script:** `body` bien escapado (sin saltos crudos); `seoTitle` ≤ 70; `excerpt` ≤ 280; `coverAlt` ≤ 200; `relatedMatchId` es un número.

### 6. Insertar en DB

Dry-run primero:
```bash
pnpm db:upsert-news /tmp/cronica-$ARGUMENTS.json --dry-run
```
Si el output cuadra (título, excerpt, categoría cronica, match vinculado), aplica:
```bash
pnpm db:upsert-news /tmp/cronica-$ARGUMENTS.json
```
INSERTA si el slug es nuevo, ACTUALIZA si ya existe (idempotente).

### 7. Limpieza
```bash
rm /tmp/cronica-$ARGUMENTS.json
```

### 8. Reporte final al user

Resume en 4-5 líneas: slug y title; INSERT o UPDATE; resultado y goleadores (de la BD); 1 anécdota destacada; y la URL pública `https://quinielamundial.es/noticias/<slug>`. Bloque `Sources:` con los enlaces consultados como markdown links.

## Reglas de oro

- **No preguntes** confirmación intermedia. Auto Mode → del tirón.
- **No commits ni pushes**: la crónica se publica directamente en DB.
- **El marcador y los goleadores SIEMPRE de nuestra BD** (paso 1), nunca de la web. La web es para narrativa/contexto/anécdotas.
- Si una búsqueda da poco, prueba otra fuente; sin info verificable, omite la sección. Mejor corto y cierto que largo e inventado.
- Solo para partidos `finished`. Si no, aborta.
