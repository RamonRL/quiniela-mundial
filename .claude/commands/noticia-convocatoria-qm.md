---
  description: Redacta y publica una noticia de convocatoria para el Mundial 2026 al estilo del resto (Bosnia, Portugal, Croacia, Suiza…), con cover si está
  disponible
  argument-hint: <CODE>
  ---

  Redacta y publica la noticia de convocatoria de la selección con código FIFA `$ARGUMENTS` para el Mundial 2026.

  ## Procedimiento (no preguntes al user, ejecuta)

  ### 1. Validación

  Verifica que `$ARGUMENTS` es código de 3 letras (regex `^[A-Z]{3}$`). Si es vacío o malformado, aborta pidiendo el código.

  Comprueba que el equipo existe y obtén su nombre:
  ```bash
  pnpm tsx --env-file=.env.local --env-file-if-exists=.env -e "import('@/lib/db').then(async ({db}) => { const {teams} = await import('@/lib/db/schema'); const
  {eq} = await import('drizzle-orm'); const [t] = await db.select().from(teams).where(eq(teams.code, '$ARGUMENTS')).limit(1); console.log(t ? 'TEAM=' + t.name :
  'NO_TEAM'); process.exit(0); })"
  ```

  Si no existe, aborta.

  ### 2. Investigación

  Usa **WebSearch** + **WebFetch** para reunir material para la noticia. Objetivos:

  - **Lista oficial** de 26 (o pre-lista de 30) y fecha del anuncio.
  - **Seleccionador y capitán**.
  - **Núcleo del equipo**: 3-5 nombres referentes con club y razón por la que importan (estrella, capitán, regreso, debut).
  - **Ausencias destacadas** con motivo (lesión, fuera por decisión técnica, polémica).
  - **Sorpresas** (jugador joven, primer Mundial de un veterano, naturalizado, herencia mixta…).
  - **Grupo** del torneo y los **3 rivales** con su nivel relativo.
  - **Calendario de la fase de grupos** (fecha + rival, si la tienes).
  - **Contexto histórico**: número de Mundiales previos, mejor resultado histórico, racha reciente. **Verifica con Wikipedia** este dato, fácil de equivocar.
  - **Frase ancla** del seleccionador o un detalle narrativo concreto (homenaje, polémica, récord) si la fuente lo proporciona.

  Mínimo 2 fuentes distintas para los datos clave. Si los datos divergen, prefiere FIFA.com, Olympics.com, Wikipedia, prensa nacional del país, o medios
  deportivos serios (BBC, ESPN, Marca, Bundesliga.com, Al Jazeera).

  ### 3. Estilo y estructura

  Sigue el patrón de las noticias existentes (Portugal, Croacia, Suiza, Escocia, Alemania). El `body` se escribe en **markdown** con esta estructura como guía —
  adapta secciones según haya material:

  ```markdown
  **<País>** anunció el **<fecha en castellano>** la lista oficial de 26 jugadores para el Mundial 2026... [lead de 2-4 frases con los titulares: quién dirige,
  capitán, gran ausencia o gran regreso, novedad principal].

  ## <Sección 1 — el titular principal>

  [3-6 párrafos sobre el ángulo principal: el regreso polémico, el debut histórico, la generación dorada, la ausencia clave...]

  ## <Sección 2 — núcleo del equipo>

  Sección "El núcleo del equipo" con lista por posiciones, cada línea con nombres en negrita y clubes. Ejemplo:

  - **Portería**: ...
  - **Defensa**: ...
  - **Mediocampo**: ...
  - **Ataque**: ...

  Cierra con: "Mira la lista completa con dorsales en la [ficha de <País>](/equipos/<CODE>)."

  ## <Sección 3 — sorpresas o ausencias>

  Bullets con 2-3 jugadores y su razón.

  ## El Grupo <X> y el calendario

  A <País> le tocó el **Grupo <X>** junto a **<Rival 1>**, **<Rival 2>** y **<Rival 3>**. [Una frase sobre la dificultad del sorteo.]

  Calendario de fase de grupos:
  - **<fecha>**: <País> vs <Rival>
  - ...

  Mira la [composición del Grupo <X>](/grupos) y el [calendario del torneo](/calendario).

  ## Lo que está en juego

  [2-3 párrafos sobre el contexto histórico y las expectativas reales de esta selección. Datos concretos: cuántos Mundiales lleva, mejor resultado, racha
  reciente, candidato a qué.]

  Si quieres predecir hasta dónde llega <País> en tu quiniela, [crea tu cuenta gratis](/login?next=%2Fonboarding) y arma tu bracket antes del 11 de junio.
  ```

  **Reglas de redacción:**
  - **No inventes nada**. Si no encuentras un dato, omítelo o reescribe la frase. Mejor menos que falso.
  - **Usa tabla solo si hay datos tabulables** (historial mundialista, dorsales por posición). No fuerces.
  - Usa **acentos y caracteres reales** (Çalhanoğlu, Ødegaard, Krejčí…) tal como en la fuente.
  - **Links internos siempre**: `/equipos/<CODE>`, `/grupos`, `/calendario`, `/login?next=%2Fonboarding`.
  - **Cierre estándar**: "Si quieres predecir hasta dónde llega <País>, [crea tu cuenta gratis]..." o variación.

  ### 4. Campos derivados

  - **slug** (kebab-case): `convocatoria-<pais-en-kebab>-mundial-2026-<dato-distintivo>`. Ejemplos:
  `convocatoria-alemania-mundial-2026-nagelsmann-neuer-regreso`, `convocatoria-portugal-mundial-2026-martinez-cristiano-ronaldo`. Que termine con 1-3 palabras
  que identifiquen el ángulo.
  - **title** (máx 140 chars): titular potente con país + ángulo + nombre clave. Estilo "Convocatoria de <País>: <ángulo>".
  - **seoTitle** (máx 70 chars): `"Convocatoria <País> Mundial 2026 · Lista de <Seleccionador>"`.
  - **excerpt** (20-280 chars): 1-2 frases con los 2-3 datos más fuertes. Incluye nombres concretos.
  - **category**: `"convocatoria"`.
  - **tags**: 4-7 strings. País + seleccionador + 2-3 jugadores clave + "Mundial 2026".
  - **relatedTeamCodes**: `["$ARGUMENTS"]`.
  - **coverAlt** (importante, no usar el default genérico): construye el texto con el patrón **`"<País> · convocatoria de <Seleccionador> para el Mundial 
  2026"`**. País con nombre en castellano (Alemania, Brasil, República Checa, Cabo Verde, Costa de Marfil…). Seleccionador con nombre y apellido completo.
  Ejemplos canónicos del proyecto:
    - `"Alemania · convocatoria de Julian Nagelsmann para el Mundial 2026"`
    - `"Portugal · convocatoria de Roberto Martínez para el Mundial 2026"`
    - `"Cabo Verde · convocatoria para el Mundial 2026"` (sin "de X" si el nombre del DT es complicado o poco conocido — Bubista entra como caso). Por defecto
  siempre incluye el seleccionador.

  ### 5. Generar JSON

  Escribe `/tmp/news-$ARGUMENTS.json`:

  ```json
  {
    "slug": "...",
    "title": "...",
    "seoTitle": "...",
    "excerpt": "...",
    "body": "Markdown completo, escapando solo \\n y \\\" como exige JSON",
    "category": "convocatoria",
    "tags": ["...", "..."],
    "relatedTeamCodes": ["$ARGUMENTS"],
    "coverAlt": "<País> · convocatoria de <Seleccionador> para el Mundial 2026"
  }
  ```

  No declares `coverFile` — el script buscará automáticamente `noticias/convocatorias/$ARGUMENTS.png`. Sí declara `coverAlt` con el patrón del paso 4.

  **Validación previa al script** (mentalmente):
  - `body` está bien escapado para JSON (sin saltos de línea crudos).
  - Sin valores `null` salvo donde el schema lo permita.
  - `seoTitle` ≤ 70 caracteres.
  - `excerpt` ≤ 280 caracteres.
  - `coverAlt` ≤ 200 caracteres.

  ### 6. Insertar en DB

  Dry-run primero:
  ```bash
  pnpm db:upsert-news /tmp/news-$ARGUMENTS.json --dry-run
  ```

  Si el output muestra título, excerpt, cover localizado correctamente, aplica:
  ```bash
  pnpm db:upsert-news /tmp/news-$ARGUMENTS.json
  ```

  El script:
  - INSERTA si el slug es nuevo, ACTUALIZA si ya existe.
  - Sube el cover desde `noticias/convocatorias/$ARGUMENTS.png` si existe.
  - Si falta el cover, no rompe — solo lo reporta como "sin cover".

  ### 7. Limpieza
  ```bash
  rm /tmp/news-$ARGUMENTS.json
  ```

  ### 8. Reporte final al user

  Resume en 4-5 líneas:
  - Slug y title final.
  - Si era INSERT o UPDATE.
  - Si se subió cover (sí / no, y por qué).
  - Datos clave del cuerpo (seleccionador, capitán, ausencias gordas, 1 sorpresa).
  - URL pública: `https://quinielamundial.es/noticias/<slug>`.

  Bloque `Sources:` al final con todos los enlaces consultados como markdown links.

  ## Reglas de oro

  - **No preguntes** confirmación intermedia. Auto Mode → del tirón.
  - **No commits ni pushes**. La noticia se publica directamente en DB.
  - Si una búsqueda falla o devuelve poco, **prueba otra fuente** antes de redactar a ciegas. Sin info verificable, omite la sección entera.
  - Idempotente: ejecutar dos veces para el mismo CODE no duplica (UPSERT por slug). Útil para iterar el copy.
  - Si quieres cambiar el cover de una noticia ya publicada, ejecuta con `--force-cover` añadido a `pnpm db:upsert-news`.
