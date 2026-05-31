---
description: Publica una nota en el tablón del dashboard resumiendo los cambios de una rama (feature/fix/mejora)
argument-hint: <nombre_rama>
---

Publica una entrada en el tablón de notas (visible en el dashboard de los
usuarios) que resume lo que hace la rama `$ARGUMENTS`. Pensado para
disparar tras mergear/desplegar un cambio importante: features nuevos,
bugs arreglados, mejoras notables.

## Procedimiento (no preguntes al user, ejecuta)

### 1. Validación

Verifica que `$ARGUMENTS` es un nombre de rama válido (regex
`^[A-Za-z0-9/_.\-]+$`). Si es vacío o malformado, aborta y pide al user
el nombre.

Comprueba que la rama existe (puede estar borrada en local pero
seguir en `origin/`, o ya mergeada a main pero recordada):

```bash
git fetch origin "$ARGUMENTS" 2>&1 | tail -3
git rev-parse --verify "refs/remotes/origin/$ARGUMENTS" 2>&1 \
  || git rev-parse --verify "$ARGUMENTS" 2>&1 \
  || git log --all --oneline --grep "Merge branch '$ARGUMENTS'" | head -3
```

Si nada apunta a una rama o a un merge commit con ese nombre, aborta
con un error claro al user. La rama puede estar borrada después de
mergear: en ese caso el merge commit es la fuente.

### 2. Reunir el contexto del cambio

Determina el rango de commits que cubre la rama. Tres casos posibles:

- **Rama viva (no mergeada)**: usa `main..origin/$ARGUMENTS`.
- **Rama ya mergeada y borrada**: localiza el merge commit
  (`git log --all --grep "Merge branch '$ARGUMENTS'"`) y usa su
  `^^! ` / `^1..^2` para extraer los commits que entraron.
- **Cambio empujado directo a main sin rama**: el user puede pasarte el
  hash del commit en vez del nombre de rama; trátalo como rango
  `<hash>^..<hash>`.

Reúne:

```bash
# Lista de commits con su subject (no body completo para no saturar contexto).
git log --oneline <rango>

# Stat de ficheros afectados — útil para decidir si el cambio es UI,
# infra, contenido, etc.
git log --stat <rango> | head -60

# Bodies de los commits con detalle (para escribir el resumen).
git log --format="%n=== %h ===%n%B" <rango>
```

### 3. Decidir el `type` de la nota

Mira los prefijos de los subjects (Conventional Commits) para clasificar:

- Si **todos / la mayoría** son `feat:` o `feat(...):` → `type = "feature"`.
- Si **todos / la mayoría** son `fix:` o `fix(...):` → `type = "fix"`.
- Si **todos / la mayoría** son `chore:`, `refactor:`, `perf:`, `style:` → `type = "improvement"`.
- Si la rama mezcla (típico de una rama grande con varios commits) y el
  cambio principal es de UX/funcionalidad → `type = "feature"`.
- Si es un mero anuncio (mantenimiento, aviso al user) → `type = "note"`.

Cuando dudes entre feature/improvement: si el user encuentra algo
**nuevo** que antes no podía hacer → `feature`. Si encuentra algo que
**ya hacía pero ahora va mejor** → `improvement`.

### 4. Redactar título y cuerpo orientados al USUARIO FINAL

El tablón lo ven personas que juegan a la quiniela, no devs. Reglas:

- **Título** (máx 120 chars): titular limpio en presente o pretérito
  perfecto, en castellano natural, sin tecnicismos. Estilo:
    "Nuevo modo paso a paso para predecir jornadas"
    "Arreglado el problema con el OTP por email"
    "Ahora puedes copiar predicciones entre quinielas"
- **Cuerpo** (máx 2000 chars, 1-4 párrafos):
    - Frase 1: qué cambia desde el punto de vista del usuario.
    - Frase 2-3 (opcional): dónde verlo / cómo usarlo / por qué importa.
    - Tono: cercano, frases cortas, sin jerga técnica (nada de "schema",
      "endpoint", "tipo enumerado", "Server Action"…). Sustituye por
      "pantalla", "página", "opción", "guardado", "envío".

**Nunca cites** rutas de archivo, nombres de funciones, ramas ni commits
en el cuerpo de la nota — eso es contexto interno. El user solo quiere
saber qué nota qué cambio en su uso de la app.

### 5. Generar el JSON

Escribe `/tmp/patch-note.json`:

```json
{
  "type": "feature" | "improvement" | "fix" | "note",
  "title": "...",
  "body": "...",
  "publish": true
}
```

Por defecto `publish: true` (la nota aparece en el dashboard
inmediatamente). Solo pon `false` si la rama está aún por desplegar y
quieres que la nota quede en borrador hasta que esté en producción.

### 6. Insertar en DB

Dry-run primero para verificar:

```bash
pnpm db:upsert-patch-note /tmp/patch-note.json --dry-run
```

Si el output cuadra (tipo correcto, longitudes razonables, publish
flag), aplica:

```bash
pnpm db:upsert-patch-note /tmp/patch-note.json
```

### 7. Limpieza

```bash
rm /tmp/patch-note.json
```

### 8. Reporte final al user

Resume en 3-4 líneas:
- Tipo y título de la nota publicada.
- Rama / commits analizados.
- Confirmación de que ya aparece en el dashboard (`/dashboard` →
  sección "Tablón de Quiniela Mundial").
- Recordatorio: editable o borrable desde `/admin/notas` si quieres
  retocar el copy.

## Reglas de oro

- **No commits ni pushes** automáticos. Esto solo escribe en la BD;
  el código de la rama ya se gestionó por su lado.
- **No analices ficheros del repo** más allá de `git log/diff` — la
  rama puede tener cientos de cambios; tu input es el mensaje de los
  commits, no leer cada archivo.
- **Si la rama es de pura infra/SEO/refactor sin impacto visible al
  user** (p. ej. solo cambios de keywords meta, ajustes internos),
  avisa al user antes de publicar: a lo mejor no merece tablón y
  prefiere saltársela.
- Idempotente NO: cada ejecución crea una nota nueva. Si te equivocas
  con el copy, retoca o borra desde `/admin/notas`.
