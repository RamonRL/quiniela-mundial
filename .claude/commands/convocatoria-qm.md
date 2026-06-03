  ---
  description: Importa la convocatoria oficial de una selección al Mundial 2026 (jugadores + dorsales + fotos)
  argument-hint: <CODE>
  ---

  Importa la convocatoria oficial de la selección con código FIFA `$ARGUMENTS` al Mundial 2026.
  
  ## Procedimiento (no preguntes al user, ejecuta)

  ### 1. Validación previa
  
  Verifica que `$ARGUMENTS` es un código de 3 letras válido. Si es vacío o malformado, aborta y pide al user el código.
  
  Comprueba que el equipo existe en DB:
  ```bash
  pnpm tsx --env-file=.env.local --env-file-if-exists=.env -e "import('@/lib/db').then(async ({db}) => { const {teams} = await import('@/lib/db/schema'); const
  {eq} = await import('drizzle-orm'); const [t] = await db.select().from(teams).where(eq(teams.code, '$ARGUMENTS')).limit(1); console.log(t ? '✓ ' + t.name : '✗
  no existe'); process.exit(0); })"
  ```

  Si no existe, aborta.

  ### 2. Buscar la convocatoria oficial

  Usa **WebSearch** + **WebFetch** para encontrar la lista oficial más reciente. Estrategia en cascada:

  1. **Fuente principal**: búsqueda `"<país> convocatoria Mundial 2026 lista 26"` o `"<country> World Cup 2026 squad announcement"`. Prioriza:
     - Sitios oficiales de la federación.
     - FIFA.com.
     - Medios deportivos serios (Bundesliga.com, BBC Sport, Marca, Olympics.com, Al Jazeera Sport, ESPN).
  2. Extrae **nombre completo + posición** de cada jugador (apunta a 26, o 30 si solo hay pre-lista).
  3. Normaliza posiciones al enum del proyecto: **POR / DEF / MED / DEL**.

  ### 3. Dorsales reales (importante)
  
  **No asignes dorsales secuenciales 1-N a ciegas.** Sigue esta cascada:
  
  1. Si la fuente principal lista dorsales oficiales del Mundial → úsalos.
  2. Si no, busca dorsales en **fuentes secundarias**: Sofascore, Transfermarkt, FlashScore, lineups del último partido amistoso de la selección, web oficial del
   club + selección. Búsquedas tipo:
     - `"<país> lineup vs <último rival>"`
     - `"<país> shirt numbers squad"`
     - `site:sofascore.com <país>`
  3. Cruza varias fuentes para los dorsales que veas en al menos 2 sitios.
  4. Para los **2-3 jugadores que no encuentres con dorsal real**, asigna uno **plausible y libre** dentro del rango típico de su posición:
     - POR: 1, 12, 22, 23
     - DEF: 2-6, 13-16
     - MED: 7, 8, 10, 14, 17-21
     - DEL: 9, 11, 24-26
     Evita colisiones con los dorsales reales ya asignados.

  Si tras buscar 5 minutos no consigues dorsales reales para >50% de la plantilla, deja explícitamente esos campos como `null` (la columna lo acepta) y avisa al
  user al final del reporte.

  ### 4. Genera el JSON
  
  Escribe el archivo `/tmp/squad-$ARGUMENTS.json` con esta estructura exacta:
  
  ```json
  {
    "code": "$ARGUMENTS",
    "players": [
      { "name": "Nombre Completo", "position": "POR", "jerseyNumber": 1 },
      { "name": "Otro Jugador", "position": "DEF", "jerseyNumber": 4 }
    ]
  }
  ```

  Reglas:
  - `name` con acentos y caracteres especiales originales (Çalhanoğlu, Ødegaard…), tal cual aparezcan en la fuente oficial.
  - `position` ∈ `["POR", "DEF", "MED", "DEL"]` solo.
  - `jerseyNumber` entero 1-99 o `null` (no asignes 0 ni strings).

  ### 5. Aplica los cambios en DB

  Ejecuta primero un dry-run para revisar:
  
  ```bash
  pnpm db:upsert-squad /tmp/squad-$ARGUMENTS.json --dry-run
  ```
  
  Si el output se ve sano (sin huérfanos sospechosos, sin nombres extraños), aplica de verdad:
  
  ```bash
  pnpm db:upsert-squad /tmp/squad-$ARGUMENTS.json
  ```
  
  ### 6. Fotos de jugadores

  Comprueba si existe la carpeta de fotos. **Prueba dos rutas en orden** (el script las prueba solo, pero tú decides si invocarlo):
  
  ```bash
  ls "plantillas/$ARGUMENTS" 2>/dev/null || ls "plantillas/$(echo $ARGUMENTS | tr 'A-Z' 'a-z')" 2>/dev/null
  ```
  
  También considera las carpetas con nombre español que sigan existiendo (alemania, brasil, korea, etc.).
  
  - **Si hay carpeta con archivos** → ejecuta `pnpm db:upload-player-photos $ARGUMENTS --dry-run`, revisa el matching, y si está limpio, ejecuta sin `--dry-run`.
  - **Si no hay carpeta o está vacía** → **skip silencioso**. Reporta "carpeta de fotos no encontrada, saltado". No es un error.

  ### 7. Limpieza

  ```bash
  rm /tmp/squad-$ARGUMENTS.json
  ```

  ### 8. Reporte final al user

  Resume en 3-4 líneas:
  - Fuente usada para la convocatoria (URL).
  - Jugadores insertados / actualizados / sin cambios.
  - Si hubo huérfanos en DB (lista de nombres) — sin borrar, solo aviso.
  - Si las fotos se cargaron o se saltaron y por qué.
  - Si quedan dorsales por confirmar manualmente.

  Incluye al final un bloque `Sources:` con todos los enlaces consultados como markdown links.

  ## Reglas de oro
  
  - **No preguntes** confirmación intermedia. Si Auto Mode está activo, ejecuta del tirón.
  - **No commits ni pushes** automáticos. Esto modifica DB en vivo; el código del script ya está commiteado.
  - Si en cualquier paso falla un comando, **detente** y reporta el error al user antes de continuar.
  - **Idempotente por diseño**: tirar el comando dos veces para el mismo equipo no causa duplicados (UPSERT por nombre).
