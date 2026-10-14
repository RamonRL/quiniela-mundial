#!/usr/bin/env bash
#
# Runner LOCAL de crónicas automáticas (pensado para el Programador de
# tareas de Windows, ejecutando este script vía Git Bash mientras el PC
# esté encendido).
#
# Qué hace:
#   1. `db:pending-cronicas` lista los partidos finished, con > N h desde el
#      kickoff (CRONICA_DELAY_HOURS, default 4 ≈ pitido final + 2 h) y SIN
#      crónica todavía. Idempotente: nunca regenera una ya publicada.
#   2. Por cada código, invoca `claude -p "/cronica-qm <code>"` en modo
#      headless. El comando investiga en la web, redacta y publica directo
#      en la BD (status=published).
#
# Si no hay pendientes, sale en segundos sin gastar tokens.
#
# Requisitos (ya presentes en esta máquina):
#   - `.env.local` con DATABASE_URL + Supabase (lo usa db:upsert-news).
#   - Claude Code autenticado (login de suscripción) en este Windows.
#
# Instalado en el Programador de tareas de Windows (cada hora en punto):
#   Programa: C:\Program Files\Git\bin\bash.exe
#   Argumentos: -lc "/c/Users/RamonRomero/workspace/personal/repos/quiniela-mundial/scripts/auto-cronica.sh >> /c/Users/RamonRomero/.cronica-qm.log 2>&1"
#
# Ver el log:  tail -f ~/.cronica-qm.log  (o ábrelo con cualquier editor)

set -euo pipefail

REPO="/c/Users/RamonRomero/workspace/personal/repos/quiniela-mundial"
cd "$REPO"

# El Programador de tareas arranca con un PATH mínimo (no carga el perfil de
# la terminal). Añadimos a mano dónde viven node/pnpm/claude en esta máquina.
export PATH="/c/Program Files/nodejs:/c/Users/RamonRomero/AppData/Roaming/npm:/c/Users/RamonRomero/.local/bin:$PATH"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

echo "[$(ts)] auto-cronica: arranque"

# Sanity: que las herramientas estén en PATH antes de seguir.
for bin in pnpm claude; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "[$(ts)] ERROR: '$bin' no está en PATH — revisa el bloque de PATH del script"
    exit 1
  fi
done

codes="$(pnpm -s db:pending-cronicas | grep -E '^[A-Z]{1,3}[0-9]{1,3}$' || true)"
if [ -z "$codes" ]; then
  echo "[$(ts)] sin crónicas pendientes"
  exit 0
fi

echo "[$(ts)] pendientes: $(echo "$codes" | tr '\n' ' ')"
for code in $codes; do
  echo "[$(ts)] === crónica $code ==="
  if claude -p "/cronica-qm $code" --dangerously-skip-permissions; then
    echo "[$(ts)] OK: $code publicado"
  else
    echo "[$(ts)] WARN: falló la crónica de $code, continúo con el resto"
  fi
done

echo "[$(ts)] auto-cronica: fin"
